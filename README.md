# invoicevista

Command-line access to your [InvoiceVista](https://www.invoicevista.com/) data
on [app.invoicevista.com](https://app.invoicevista.com): the customers you
bill, the product catalogue you bill them from, and the invoices, quotes and
recorded payments in between — the same records the dashboard shows, through
the InvoiceVista REST API at `https://api.invoicevista.com`.

## Install

```bash
npm install -g invoicevista   # global install
npx invoicevista --help       # or run without installing
```

Requires Node.js 18 or newer.

## Quick start

```bash
invoicevista login                                  # choose browser or API key login
invoicevista businesses list                        # the businesses of your organization
invoicevista customers list --businessId <businessId>
invoicevista invoices list --businessId <businessId> -n 10
```

```
Found 1 business(es):
1. Example Studio (64a1f2c9e4b0a1b2c3d4e5f6)
```

## Signing up

No account yet? Create one from the terminal. The generated password prints
exactly once, your organization and its first business are created for you,
and the session is stored so every other command works immediately:

```bash
invoicevista signup --email founder@example.com --json
```

## Authentication

Two ways in, both stored in `~/.invoicevista/`:

- **Browser** — `invoicevista login --browser` opens
  [app.invoicevista.com](https://app.invoicevista.com) in your browser to log
  in with your InvoiceVista account, then stores a token session. Tokens are
  refreshed automatically; requests carry `Authorization: Token base64(<jwt>)`.
- **API key** — `invoicevista login --with-key` prompts for an API key secret
  with a masked input. An administrator of your organization creates the key
  in the InvoiceVista dashboard, per business, under **API keys**. The secret
  is shown **once**, when the key is created, and never again — store it
  somewhere safe. It is never accepted as a command-line argument, so it
  cannot leak into your shell history. Requests carry
  `Authorization: Basic base64(<key secret>)` — the secret alone,
  base64-encoded, with no username and no colon.

Plain `invoicevista login` in a terminal asks which method to use.
`invoicevista logout` deletes everything stored in `~/.invoicevista/`.

**Headless / CI / agents** — export `INVOICEVISTA_API_KEY=<key secret>` and
skip `login` entirely: every command reads it at request time. When several
credentials exist the precedence is stored browser session, then stored key,
then the environment variable — a stored login always wins over an exported
key, so a globally exported `INVOICEVISTA_API_KEY` never hijacks an
interactive session.

Without a terminal the CLI never hangs and never opens a browser:
`invoicevista login` (and any command run without credentials) fails
immediately with exit code 1 and instructions on stderr.

A key belongs to a single organization and is locked to one business, so
neither ever has to be named on the command line; a browser session covers the
whole organization and passes `--businessId` explicitly.

### Scopes

Each API key carries per-resource scopes: `invoices:read`, `invoices:write`,
`quotes:read`, `quotes:write`, `customers:read`, `customers:write`,
`products:read`, `products:write`, `payments:read`, `payments:write`. New keys
start read-only; an administrator widens them in the dashboard. A command
hitting a scope the key lacks fails with `403`. Requests are rate limited per
key; going over the limit returns `429`.

There is deliberately no scope for businesses, webhook subscriptions or API
keys — those are dashboard concerns — so `invoicevista businesses`,
`invoicevista webhooks` and `invoicevista keys` need a browser login rather
than a key, and `keys` additionally needs an admin role. A browser login
carries your own user permissions instead of key scopes.

## JSON output

Every subcommand accepts `--json` and prints real, parseable JSON on stdout —
plain `JSON.stringify`, no colors. Without the flag, `list` and `read` print
human summaries. Mutations with `--json` print a small result object:
`{ "ok": true, "id": "…" }` for `add`/`update`,
`{ "ok": true, "deleted": ["…"] }` for `delete`.

Errors always go to stderr with exit code 1; with `--json` the error is a
single JSON line — `{"error":{"message":"…","status":404}}` — so stdout stays
clean for parsing.

```bash
invoicevista invoices list --json -n 100 | jq '.[] | {id: ._id, status, issueTime}'
```

## Commands

### Session

```bash
invoicevista signup --email you@example.com   # create an account and log in
invoicevista login                            # interactive: browser or API key
invoicevista login --browser                  # log in through app.invoicevista.com
invoicevista login --with-key                 # prompt for an API key secret (masked)
invoicevista logout                           # clear everything in ~/.invoicevista/
```

### Schema

```bash
invoicevista schema                     # the whole command tree as JSON
invoicevista schema invoices list       # one subtree: its options and arguments
```

Machine-readable discovery of every command, option and argument — for agents
and scripts that would otherwise scrape `--help` text.

### Businesses (read-only, browser login)

```bash
invoicevista businesses list              # -n/--limit, --skip, --fields, --json
invoicevista businesses get <businessId>  # raw JSON for one business
invoicevista businesses read <businessId> # formatted view: currency, country, locale
```

Every write below needs a `businessId`; this is where you find it.

### Customers

```bash
invoicevista customers list                            # --businessId, --email, --json
invoicevista customers list --email jane@example.com   # exact-email lookup
invoicevista customers list --id <customerId>          # also --ids <a,b,c>
invoicevista customers list --fields name,email,phone  # project fields
invoicevista customers get <customerId>                # raw JSON
invoicevista customers read <customerId>               # formatted view
invoicevista customers add --name "Jane Fonda" --email jane@example.com \
  --phone 5551234567 --businessId <businessId>
invoicevista customers update <customerId> --phone 5559876543
invoicevista customers update <customerId> --body '{"address":{"city":"Lisbon"}}'
invoicevista customers delete <customerId...>          # one or more ids
```

`customers list` has no pagination — the handler returns every match — so
narrow it with `--businessId`, `--email`, `--id`, `--ids` or `--fields`.
`add`/`update` also accept `--language`, `--taxId` and `--legalEntity`; the
billing address is a nested object (`street`, `postalCode`, `city`, `state`,
`countryCode`) and is set through `--body`.

### Products

```bash
invoicevista products list --businessId <businessId>   # -n/--limit, --skip, --sortField
invoicevista products get <productId>                  # raw JSON
invoicevista products read <productId>                 # formatted view
invoicevista products add --name "Consulting" --price 500 --businessId <businessId>
invoicevista products update <productId> --price 550
invoicevista products delete <productId...>
```

### Invoices, quotes and payments

The three billing documents share one shape: `lines` of
`{ item, description, quantity, unitPrice, productId }`, an optional
`discount`, a `customerId`, an `issueTime` and a `dueTime`. Totals are not
stored — a document's value is its lines minus any discount.

```bash
invoicevista invoices list --businessId <businessId> -n 25
invoicevista invoices list --customerId <customerId> \
  --sortField issueTime --sortDirection DESC
invoicevista invoices list --issueStartTime 2026-01-01T00:00:00.000Z \
  --issueEndTime 2026-02-01T00:00:00.000Z
invoicevista invoices get <invoiceId>
invoicevista invoices read <invoiceId>
invoicevista invoices add --businessId <businessId> --customerId <customerId> \
  --issueTime 2026-01-15T00:00:00.000Z --dueTime 2026-02-14T00:00:00.000Z \
  --body '{"lines":[{"item":"Consulting","unitPrice":500,"quantity":2}]}'
invoicevista invoices update <invoiceId> --status PAID
invoicevista invoices delete <invoiceId...>
```

`quotes` and `payments` take the same subcommands, options and `--body` shape:

```bash
invoicevista quotes list --businessId <businessId>
invoicevista quotes update <quoteId> --status APPROVED
invoicevista payments list --customerId <customerId>
invoicevista payments add --businessId <businessId> --customerId <customerId> \
  --body '{"lines":[{"item":"Consulting","unitPrice":500,"quantity":2}]}'
```

Invoice `--status` accepts `DRAFT`, `PENDING`, `PARTIALLY_PAID`, `PAID`,
`OVERDUE`, `REFUNDED` or `UNCOLLECTIBLE`. Quote `--status` accepts `DRAFT`,
`PENDING`, `REJECTED` or `APPROVED`. Payments have no status.

Date filtering is `--issueStartTime` (inclusive) and `--issueEndTime`
(exclusive), both ISO 8601. They match on `issueTime`, falling back to
`creationTime` for documents imported before `issueTime` existed. The API also
accepts `startTime`/`endTime`, but those name legacy fields billing documents
no longer carry, so the CLI deliberately does not offer them.

### Webhooks (browser login)

```bash
invoicevista webhooks events                          # the event vocabulary
invoicevista webhooks list --businessId <businessId>
invoicevista webhooks get <webhookSubscriptionId>     # raw JSON
invoicevista webhooks read <webhookSubscriptionId>    # formatted view
invoicevista webhooks add --url https://example.com/hook \
  --businessId <businessId> --events invoice.created,invoice.updated
invoicevista webhooks update <webhookSubscriptionId> --active true
invoicevista webhooks delete <webhookSubscriptionId...>
```

The signing secret is returned exactly once, in the `add` response — store it
immediately. A subscription with no events receives every event. Delivery is
one best-effort attempt with a five second timeout and no retries; an endpoint
that fails twenty times in a row is disabled automatically and is re-enabled
with `--active true`. The endpoint must be `https` and resolve to a public
address.

### API keys (browser login + admin role)

```bash
invoicevista keys list --businessId <businessId>      # secrets projected out
invoicevista keys get <keyId>
invoicevista keys add --businessId <businessId> --name "Zapier" \
  --scopes invoices:read,customers:read
invoicevista keys update <keyId> --businessId <businessId> \
  --scopes invoices:read,invoices:write
invoicevista keys delete <keyId...>                   # immediate and permanent
```

The secret is server-minted and returned exactly once, in the `add` response.
There is no way to read it back — a lost secret means minting a new key. A key
created with no `--scopes` starts with every `:read` scope.

### Skills

```bash
invoicevista skills list                        # names and descriptions of the bundled guides
invoicevista skills get invoicevista            # print a bundled SKILL.md to stdout
```

## Notes on writes

- Every create needs a `businessId`. Pass `--businessId`, or use a key locked
  to one business, which supplies it implicitly. On `update`, when neither is
  given, the CLI reads the record first and reuses its `businessId` — that
  path needs the matching `:read` scope too.
- `update` sends only the fields you pass (plus `--body` JSON); the API merges
  them into the stored record.
- Creates and updates fire the corresponding webhooks (`customer.created`,
  `invoice.updated`, …) for the business's webhook subscriptions, exactly as
  dashboard edits do.
- Deletes are permanent and accept multiple ids
  (`invoicevista invoices delete <id1> <id2>`). Deleting a customer also
  deletes their privacy-consent forms, submissions and signatures.
- Reading a record that belongs to another organization answers `404`, not
  `403`, so ids cannot be probed.

## Configuration

`INVOICEVISTA_API_URL` overrides the API endpoint (default
`https://api.invoicevista.com`) — only needed against a non-production
deployment. `INVOICEVISTA_API_KEY` supplies an API key secret from the
environment for headless use. Stored credentials live only in
`~/.invoicevista/`; the CLI sends them to the InvoiceVista API and nowhere
else, and collects no telemetry.

## Usage with AI agents

Install the InvoiceVista agent skills for Claude Code, Cursor, Codex, and any
other agent that supports the Skills standard:

```bash
npx skills add invoicevista/skills
```

The same guides ship inside the npm package, version-matched to the installed
CLI:

```bash
invoicevista skills list                 # what is bundled
invoicevista skills get invoicevista     # the CLI guide matching this version
```

Or paste this into your `AGENTS.md` / `CLAUDE.md`:

```markdown
## InvoiceVista

Use the `invoicevista` CLI for InvoiceVista data: businesses, customers,
products, invoices, quotes and payments. Run
`npx invoicevista skills get invoicevista` for the full guide,
`invoicevista schema` for the command tree as JSON, and `invoicevista --help`
for the command reference. Log in once with `invoicevista login` (browser or
API key), or export INVOICEVISTA_API_KEY for headless use. Every subcommand
accepts `--json`.
```

Prefer raw HTTP? The same API key authenticates the REST API directly —
`https://api.invoicevista.com` with
`Authorization: Basic base64(<key secret>)`. There is also a read-only MCP
connector at `https://mcp.invoicevista.com/mcp` for aggregate revenue and
receivables analysis in Claude, ChatGPT and Codex.

## License

[Apache-2.0](LICENSE)
