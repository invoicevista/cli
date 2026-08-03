/* Copyright 2025 InvoiceVista LLC */

// Invoices, quotes and payments are the three billing documents. Their list
// handlers in invoicevista/api read the same query parameters and their pages
// write the same fields, so the shared halves live here and each command file
// contributes only what is genuinely its own (the status vocabulary, the
// wording, the terminal view).
//
// Two query parameters the handlers also accept are deliberately NOT offered:
// `startTime` and `endTime`. They filter on document fields of the same name,
// which billing documents stopped carrying when the DodoDentist-inherited
// naming was migrated to `issueTime`/`dueTime` — so those filters match
// nothing today. `--issueStartTime` / `--issueEndTime` are the working date
// range: the handler widens them to `issueTime`, falling back to
// `creationTime` for documents imported before `issueTime` existed.
const documentFilters = [
  {
    flags: '--businessId <businessId>',
    description: 'only documents of this business',
    name: 'businessId',
  },
  {
    flags: '--customerId <customerId>',
    description: 'only documents billed to this customer',
    name: 'customerId',
  },
  {
    flags: '--issueStartTime <issueStartTime>',
    description: 'issued on or after this ISO timestamp (inclusive)',
    name: 'issueStartTime',
  },
  {
    flags: '--issueEndTime <issueEndTime>',
    description: 'issued before this ISO timestamp (exclusive)',
    name: 'issueEndTime',
  },
  {
    flags: '-n, --limit <limit>',
    description: 'max results (0 or omitted returns all)',
    name: 'limit',
  },
  {
    flags: '--skip <skip>',
    description: 'skip the first N results',
    name: 'skip',
  },
  {
    flags: '--sortField <sortField>',
    description: 'field to sort by, e.g. issueTime or creationTime',
    name: 'sortField',
  },
  {
    flags: '--sortDirection <sortDirection>',
    description: 'ASC or DESC (default DESC)',
    name: 'sortDirection',
  },
  {
    flags: '--fields <fields>',
    description: 'comma-separated projection of fields',
    name: 'fields',
  },
]

// `lines` is an array of { item, description, quantity, unitPrice,
// productId }, and `discount` is an object, so both are set through
// --body rather than flattened into flags.
const documentWriteFields = [
  {
    flags: '--customerId <customerId>',
    description: 'customer the document is billed to',
    name: 'customerId',
  },
  {
    flags: '--issueTime <issueTime>',
    description: 'issue date, ISO 8601',
    name: 'issueTime',
  },
  {
    flags: '--dueTime <dueTime>',
    description: 'due date, ISO 8601',
    name: 'dueTime',
  },
  {
    flags: '--note <note>',
    description: 'free-text note printed on the document',
    name: 'note',
  },
]

function statusField(statuses) {
  return {
    flags: '--status <status>',
    description: `one of ${statuses.join(', ')}`,
    name: 'status',
  }
}

function documentRow(document, label) {
  const parts = [
    document.number ? `${label} ${document.number}` : label,
    document.status,
    document.issueTime,
  ].filter(Boolean)

  return parts.join(' · ')
}

function documentDetail(document) {
  return [
    ['status', document.status],
    ['customerId', document.customerId],
    ['issueTime', document.issueTime],
    ['dueTime', document.dueTime],
    ['lines', document.lines?.length],
    ['note', document.note],
    ['businessId', document.businessId],
    ['created', document.creationTime],
  ]
}

module.exports = {
  documentFilters,
  documentWriteFields,
  statusField,
  documentRow,
  documentDetail,
}
