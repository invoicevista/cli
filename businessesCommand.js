/* Copyright 2025 InvoiceVista LLC */
const resourceCommand = require('./resourceCommand.js')

// Businesses are the per-tenant containers every invoice, quote, customer,
// product and payment hangs off. They are read-only here for two reasons:
// there is no `businesses` scope at all — `GET /api/businesses` accepts an
// access token only, so this group needs a browser login rather than an API
// key — and businesses are created at signup and edited in the dashboard.
//
// This is the fastest way to find the businessId the other groups want.
function businessesCommand() {
  return resourceCommand({
    name: 'businesses',
    singular: 'business',
    path: '/api/businesses',
    description:
      'read the businesses of your organization (browser login only, read-only)',
    listDescription:
      'list businesses (GET /api/businesses) — needs a browser login, not an API key',
    readOnly: true,
    filters: [
      {
        flags: '-n, --limit <limit>',
        description: 'max results (server-capped at 1000)',
        name: 'limit',
      },
      {
        flags: '--skip <skip>',
        description: 'skip the first N results',
        name: 'skip',
      },
      {
        flags: '--fields <fields>',
        description: 'comma-separated projection of fields',
        name: 'fields',
      },
    ],
    row: business => business.name || business._id,
    detail: business => [
      ['currency', business.currency],
      ['country', business.countryCode],
      ['locale', business.defaultLocale],
      ['city', business.city],
      ['phone', business.phone],
      ['created', business.creationTime],
    ],
  })
}

module.exports = businessesCommand
