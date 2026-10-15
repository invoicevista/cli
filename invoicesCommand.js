/* Copyright 2025 InvoiceVista LLC */
import {
  documentDetail,
  documentFilters,
  documentRow,
  documentWriteFields,
  statusField,
} from './documentFields.js'
import resourceCommand from './resourceCommand.js'

// Invoice.Status in @invoicevista/model — the exact vocabulary the API and
// the dashboard share. A new invoice with no status is DRAFT.
const STATUSES = [
  'DRAFT',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'REFUNDED',
  'UNCOLLECTIBLE',
]

function invoicesCommand() {
  return resourceCommand({
    name: 'invoices',
    singular: 'invoice',
    path: '/api/invoices',
    description: 'manage invoices (invoices:read / invoices:write)',
    filters: documentFilters,
    writeFields: [...documentWriteFields, statusField(STATUSES)],
    addDescription:
      'create an invoice (POST /api/invoices, fires invoice.created).' +
      ' Add lines with --body \'{"lines":[{"item":"Consulting","unitPrice":500,"quantity":2}]}\'',
    row: invoice => documentRow(invoice, 'Invoice'),
    detail: documentDetail,
  })
}

export default invoicesCommand
