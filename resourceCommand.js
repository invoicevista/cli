/* Copyright 2025 InvoiceVista LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveBusinessId = require('./resolveBusinessId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// The five key-authenticated InvoiceVista resources — customers, products,
// invoices, quotes and payments — are the same REST shape behind the same
// scope pair: `GET /api/<resource>` with query filters, `GET|PUT|DELETE
// /api/<resource>/:id`, `POST /api/<resource>`. Their command files declare
// what actually differs (the filters each list handler reads, the body fields
// worth a flag, and how a record reads in a terminal) and share everything
// else from here, so a filter that does not exist in the handler cannot creep
// into one resource and not the others.
//
// `filters` and `writeFields` are `{ flags, description, name }`: `flags` is
// the commander flag string, `name` is the query parameter or body field it
// maps to. Nothing is invented — every `name` is read by the matching
// handler in invoicevista/api.
function resourceCommand({
  name,
  singular,
  path,
  description,
  listDescription,
  filters = [],
  writeFields = [],
  addDescription,
  updateDescription,
  deleteDescription,
  readOnly = false,
  row,
  detail,
}) {
  const command = new commander.Command(name)
  command.description(description)

  function applyOptions(subcommand, definitions) {
    definitions.forEach(definition => {
      if (definition.required) {
        subcommand.requiredOption(definition.flags, definition.description)
      } else {
        subcommand.option(definition.flags, definition.description)
      }
    })

    return subcommand
  }

  // commander stores `--sortField <x>` as options.sortField and
  // `-n, --limit <n>` as options.limit; the long flag's camelCase form is the
  // property name, which is what `name` matches against.
  function pick(options, definitions) {
    const picked = {}

    definitions.forEach(definition => {
      const property = definition.flags
        .split(/[ ,]+/)
        .filter(part => part.startsWith('--'))[0]
        .replace(/^--/, '')
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

      if (options[property] !== undefined) {
        // commander hands every option value over as a string. A field the
        // API stores as a number has to be coerced here, or the record ends
        // up with `"price": "500"` and every consumer that does arithmetic on
        // it silently reads a string.
        picked[definition.name] = definition.coerce
          ? definition.coerce(options[property])
          : options[property]
      }
    })

    return picked
  }

  withJson(
    applyOptions(
      command
        .command('list')
        .description(listDescription || `list ${name} (GET ${path})`),
      filters,
    ),
  ).action(async options => {
    try {
      const items = await api.get(
        `${path}${buildQuery(pick(options, filters))}`,
      )

      if (options.json) {
        printJson(items)

        return
      }

      if (items.length === 0) {
        console.log(`No ${name} found`)

        return
      }

      console.log(`Found ${items.length} ${name}:`)
      items.forEach((item, index) => {
        console.log(`${index + 1}. ${row(item)} (${item._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command(`get <${singular}Id>`)
      .description(`raw JSON for one ${singular} (GET ${path}/:${singular}Id)`),
  ).action(async (id, options) => {
    try {
      printJson(await api.get(`${path}/${id}`))
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command(`read <${singular}Id>`)
      .description(`read one ${singular} formatted for the terminal`),
  ).action(async (id, options) => {
    try {
      const item = await api.get(`${path}/${id}`)

      if (options.json) {
        printJson(item)

        return
      }

      if (!item) {
        console.log(`${singular} not found`)

        return
      }

      console.log()
      console.log(bold(row(item)))
      console.log(dim(item._id))
      console.log()
      detail(item).forEach(([label, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          console.log(`${cyan(label)}  ${value}`)
        }
      })
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  // A resource the public API exposes for reading only stops here: offering
  // an `add` that always 403s would be worse than not offering it.
  if (readOnly) {
    return command
  }

  withJson(
    applyOptions(
      command
        .command('add')
        .description(
          addDescription ||
            `create a ${singular} (POST ${path}, fires ${singular}.created)`,
        )
        .option(
          '--businessId <businessId>',
          'business the record belongs to (required unless the key is locked to one business)',
        )
        .option('--body <json>', 'extra JSON fields merged into the body'),
      writeFields,
    ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const item = await api.post(path, {
        ...body,
        ...(options.businessId && { businessId: options.businessId }),
        ...pick(options, writeFields),
      })

      if (options.json) {
        printJson({ ok: true, id: item._id })

        return
      }

      printJson(item)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    applyOptions(
      command
        .command(`update <${singular}Id>`)
        .description(
          updateDescription ||
            `update a ${singular} (PUT ${path}/:${singular}Id, fires ${singular}.updated)`,
        )
        .option('--businessId <businessId>', 'business the record belongs to')
        .option('--body <json>', 'extra JSON fields merged into the body'),
      // Nothing is mandatory on update — the handler merges whatever it gets
      // into the stored record — so a field required by `add` is optional
      // here.
      writeFields.map(field => ({ ...field, required: false })),
    ),
  ).action(async (id, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const businessId = await resolveBusinessId(options, body, () =>
        api.get(`${path}/${id}`),
      )
      const item = await api.put(`${path}/${id}`, {
        ...body,
        _id: id,
        ...(businessId && { businessId }),
        ...pick(options, writeFields),
      })

      if (options.json) {
        printJson({ ok: true, id: item._id })

        return
      }

      printJson(item)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command(`delete <${singular}Id...>`)
      .description(
        deleteDescription ||
          `delete one or more ${name} by id (DELETE ${path}/:${singular}Id)`,
      ),
  ).action(async (ids, options) => {
    const deleted = []

    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index]

      try {
        await api.del(`${path}/${id}`)
        deleted.push(id)

        if (!options.json) {
          console.log(`deleted ${id}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === ids.length, deleted })
    }
  })

  return command
}

module.exports = resourceCommand
