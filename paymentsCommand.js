/* Copyright 2025 InvoiceVista LLC */
const {
  documentDetail,
  documentFilters,
  documentRow,
  documentWriteFields,
} = require('./documentFields.js')
const resourceCommand = require('./resourceCommand.js')

// Payments record money actually received. Unlike invoices and quotes they
// carry no status — a recorded payment is a fact, not a state machine.
function paymentsCommand() {
  return resourceCommand({
    name: 'payments',
    singular: 'payment',
    path: '/api/payments',
    description: 'manage recorded payments (payments:read / payments:write)',
    filters: documentFilters,
    writeFields: documentWriteFields,
    addDescription:
      'record a payment (POST /api/payments, fires payment.created).' +
      ' Add lines with --body \'{"lines":[{"item":"Consulting","unitPrice":500,"quantity":2}]}\'',
    row: payment => documentRow(payment, 'Payment'),
    detail: documentDetail,
  })
}

module.exports = paymentsCommand
