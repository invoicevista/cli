/* Copyright 2025 InvoiceVista LLC */
const {
  documentDetail,
  documentFilters,
  documentRow,
  documentWriteFields,
  statusField,
} = require('./documentFields.js')
const resourceCommand = require('./resourceCommand.js')

// Quote.Status in @invoicevista/model. A new quote with no status is DRAFT;
// APPROVED and REJECTED are the two decisions the pipeline reports on.
const STATUSES = ['DRAFT', 'PENDING', 'REJECTED', 'APPROVED']

function quotesCommand() {
  return resourceCommand({
    name: 'quotes',
    singular: 'quote',
    path: '/api/quotes',
    description: 'manage quotes and estimates (quotes:read / quotes:write)',
    filters: documentFilters,
    writeFields: [...documentWriteFields, statusField(STATUSES)],
    addDescription:
      'create a quote (POST /api/quotes, fires quote.created).' +
      ' Add lines with --body \'{"lines":[{"item":"Consulting","unitPrice":500,"quantity":2}]}\'',
    row: quote => documentRow(quote, 'Quote'),
    detail: documentDetail,
  })
}

module.exports = quotesCommand
