/* Copyright 2025 InvoiceVista LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import * as commander from 'commander'

import buildQuery from './buildQuery.js'
import { bold, cyan, dim } from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'

// Webhook subscriptions are managed with an access token only — there is no
// webhooks scope, so an API key cannot reach them. `invoicevista login
// --browser` first.
//
// `events` is the one exception and needs no credentials at all: the event
// vocabulary is a public constant.
function webhooksCommand() {
  const command = new commander.Command('webhooks')
  command.description(
    'manage webhook subscriptions (browser login only — API keys have no webhooks scope)',
  )

  withJson(
    command
      .command('events')
      .description(
        'the event names a subscription can filter on (GET /api/webhookevents)',
      ),
  ).action(async options => {
    try {
      const events = await api.get('/api/webhookevents')

      if (options.json) {
        printJson(events)

        return
      }

      events.forEach(event => console.log(event))
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('list')
      .description('list webhook subscriptions (GET /api/webhooksubscriptions)')
      .option(
        '--businessId <businessId>',
        'only subscriptions of this business',
      )
      .option('-n, --limit <limit>', 'max results (0 or omitted returns all)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. creationTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const subscriptions = await api.get(
        `/api/webhooksubscriptions${buildQuery({
          businessId: options.businessId,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(subscriptions)

        return
      }

      if (subscriptions.length === 0) {
        console.log('No webhook subscriptions found')

        return
      }

      console.log(`Found ${subscriptions.length} webhook subscription(s):`)
      subscriptions.forEach((subscription, index) => {
        const state = subscription.active === false ? 'disabled' : 'active'
        console.log(
          `${index + 1}. ${subscription.url} [${state}] (${subscription._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <webhookSubscriptionId>')
      .description(
        'raw JSON for one subscription (GET /api/webhooksubscriptions/:id)',
      ),
  ).action(async (webhookSubscriptionId, options) => {
    try {
      printJson(
        await api.get(`/api/webhooksubscriptions/${webhookSubscriptionId}`),
      )
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <webhookSubscriptionId>')
      .description('read one subscription formatted for the terminal'),
  ).action(async (webhookSubscriptionId, options) => {
    try {
      const subscription = await api.get(
        `/api/webhooksubscriptions/${webhookSubscriptionId}`,
      )

      if (options.json) {
        printJson(subscription)

        return
      }

      if (!subscription) {
        console.log('Webhook subscription not found')

        return
      }

      console.log()
      console.log(bold(subscription.url || subscription._id))
      console.log(dim(subscription._id))
      console.log()
      console.log(
        `${cyan('active')}  ${subscription.active === false ? 'no' : 'yes'}`,
      )
      console.log(
        `${cyan('events')}  ${
          subscription.events?.length ? subscription.events.join(', ') : 'all'
        }`,
      )

      if (subscription.consecutiveFailures !== undefined) {
        console.log(`${cyan('failures')}  ${subscription.consecutiveFailures}`)
      }

      if (subscription.businessId) {
        console.log(`${cyan('businessId')}  ${subscription.businessId}`)
      }

      if (subscription.creationTime) {
        console.log(`${cyan('created')}  ${subscription.creationTime}`)
      }

      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'create a subscription (POST /api/webhooksubscriptions) — the signing secret is returned exactly once, here',
      )
      .requiredOption(
        '--url <url>',
        'https endpoint deliveries are POSTed to (must resolve to a public address)',
      )
      .requiredOption(
        '--businessId <businessId>',
        'business whose events are delivered',
      )
      .option(
        '--events <events>',
        'comma-separated event names; omit to receive every event',
      )
      .option('--body <json>', 'extra JSON fields merged into the body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const subscription = await api.post('/api/webhooksubscriptions', {
        ...body,
        url: options.url,
        businessId: options.businessId,
        ...(options.events && {
          events: options.events
            .split(',')
            .map(event => event.trim())
            .filter(Boolean),
        }),
      })

      if (options.json) {
        printJson({
          ok: true,
          id: subscription._id,
          secret: subscription.secret,
        })

        return
      }

      printJson(subscription)
      console.error(
        'Store the secret above now — it is shown once and never returned again.',
      )
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <webhookSubscriptionId>')
      .description(
        'update url, events or active (PUT /api/webhooksubscriptions/:id); the secret and business are immutable',
      )
      .option('--url <url>', 'https endpoint deliveries are POSTed to')
      .option(
        '--events <events>',
        'comma-separated event names; empty string means every event',
      )
      .option(
        '--active <active>',
        'true or false — set true to re-enable an auto-disabled endpoint',
      )
      .option('--body <json>', 'extra JSON fields merged into the body'),
  ).action(async (webhookSubscriptionId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const subscription = await api.put(
        `/api/webhooksubscriptions/${webhookSubscriptionId}`,
        {
          ...body,
          ...(options.url && { url: options.url }),
          ...(options.events !== undefined && {
            events: options.events
              .split(',')
              .map(event => event.trim())
              .filter(Boolean),
          }),
          ...(options.active !== undefined && {
            active: options.active !== 'false',
          }),
        },
      )

      if (options.json) {
        printJson({ ok: true, id: subscription._id })

        return
      }

      printJson(subscription)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <webhookSubscriptionId...>')
      .description(
        'delete one or more subscriptions (DELETE /api/webhooksubscriptions/:id)',
      ),
  ).action(async (webhookSubscriptionIds, options) => {
    const deleted = []

    for (let index = 0; index < webhookSubscriptionIds.length; index += 1) {
      const webhookSubscriptionId = webhookSubscriptionIds[index]

      try {
        await api.del(`/api/webhooksubscriptions/${webhookSubscriptionId}`)
        deleted.push(webhookSubscriptionId)

        if (!options.json) {
          console.log(`deleted ${webhookSubscriptionId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({
        ok: deleted.length === webhookSubscriptionIds.length,
        deleted,
      })
    }
  })

  return command
}

export default webhooksCommand
