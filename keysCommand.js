/* Copyright 2025 InvoiceVista LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import * as commander from 'commander'

import buildQuery from './buildQuery.js'
import parseBody from './parseBody.js'
import api from './request.js'

// API keys are credentials, so /api/keys accepts an access token only and the
// caller must be an admin of the organization: run `invoicevista login
// --browser` first, then mint a key for headless use.
//
// The secret is server-minted and returned exactly once, in the `add`
// response. `list` and `get` project it out and there is no way to read it
// back — the dashboard's password-gated route is not exposed here, because a
// CLI that can re-read every key secret is a much worse thing to leave logged
// in on a laptop than one that cannot.
const SCOPES = [
  'invoices:read',
  'invoices:write',
  'quotes:read',
  'quotes:write',
  'customers:read',
  'customers:write',
  'products:read',
  'products:write',
  'payments:read',
  'payments:write',
]

function keysCommand() {
  const command = new commander.Command('keys')
  command.description(
    'manage API keys (browser login + admin role required; secrets are shown once)',
  )

  withJson(
    command
      .command('list')
      .description('list API keys without their secrets (GET /api/keys)')
      .option('--businessId <businessId>', 'only keys of this business')
      .option('-n, --limit <limit>', 'max results (0 or omitted returns all)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. creationTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const keys = await api.get(
        `/api/keys${buildQuery({
          businessId: options.businessId,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(keys)

        return
      }

      if (keys.length === 0) {
        console.log('No API keys found')

        return
      }

      console.log(`Found ${keys.length} API key(s):`)
      keys.forEach((key, index) => {
        const scopes = key.scopes?.length ? key.scopes.join(', ') : 'all'
        console.log(`${index + 1}. ${key.name || key._id} [${scopes}]`)
        console.log(`   ${key._id}`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <keyId>')
      .description(
        'raw JSON for one key, secret projected out (GET /api/keys/:keyId)',
      ),
  ).action(async (keyId, options) => {
    try {
      printJson(await api.get(`/api/keys/${keyId}`))
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'mint an API key (POST /api/keys) — the secret is returned exactly once, here',
      )
      .requiredOption(
        '--businessId <businessId>',
        'business the key is locked to',
      )
      .option('--name <name>', 'label shown in the dashboard')
      .option(
        '--scopes <scopes>',
        `comma-separated subset of ${SCOPES.join(', ')} (default: every :read scope)`,
      )
      .option('--body <json>', 'extra JSON fields merged into the body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const key = await api.post('/api/keys', {
        ...body,
        businessId: options.businessId,
        ...(options.name && { name: options.name }),
        ...(options.scopes && {
          scopes: options.scopes
            .split(',')
            .map(scope => scope.trim())
            .filter(Boolean),
        }),
      })

      if (options.json) {
        printJson({ ok: true, id: key._id, secret: key.secret })

        return
      }

      printJson(key)
      console.error(
        'Store the secret above now — it is shown once and never returned again.',
      )
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <keyId>')
      .description(
        'update a key’s name or scopes (PUT /api/keys/:keyId); the secret and business are immutable',
      )
      .requiredOption(
        '--businessId <businessId>',
        'business the key belongs to — the API matches on it',
      )
      .option('--name <name>', 'label shown in the dashboard')
      .option(
        '--scopes <scopes>',
        `comma-separated subset of ${SCOPES.join(', ')}`,
      )
      .option('--body <json>', 'extra JSON fields merged into the body'),
  ).action(async (keyId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const key = await api.put(`/api/keys/${keyId}`, {
        ...body,
        businessId: options.businessId,
        ...(options.name && { name: options.name }),
        ...(options.scopes && {
          scopes: options.scopes
            .split(',')
            .map(scope => scope.trim())
            .filter(Boolean),
        }),
      })

      if (options.json) {
        printJson({ ok: true, id: key._id })

        return
      }

      printJson(key)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <keyId...>')
      .description(
        'revoke one or more API keys (DELETE /api/keys/:keyId) — immediate and permanent',
      ),
  ).action(async (keyIds, options) => {
    const deleted = []

    for (let index = 0; index < keyIds.length; index += 1) {
      const keyId = keyIds[index]

      try {
        await api.del(`/api/keys/${keyId}`)
        deleted.push(keyId)

        if (!options.json) {
          console.log(`deleted ${keyId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === keyIds.length, deleted })
    }
  })

  return command
}

export default keysCommand
