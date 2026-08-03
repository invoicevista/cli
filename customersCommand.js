/* Copyright 2025 InvoiceVista LLC */
const resourceCommand = require('./resourceCommand.js')

// GET /api/customers has no limit/skip/sort — the handler runs a plain
// find().project() — so, unlike the document resources, no pagination flags
// are offered here. `--fields` is the way to keep a large list small.
function customersCommand() {
  return resourceCommand({
    name: 'customers',
    singular: 'customer',
    path: '/api/customers',
    description:
      'manage the customers you bill (customers:read / customers:write)',
    filters: [
      {
        flags: '--businessId <businessId>',
        description: 'only customers of this business',
        name: 'businessId',
      },
      {
        flags: '--email <email>',
        description: 'only customers with this exact email',
        name: 'email',
      },
      {
        flags: '--userId <userId>',
        description: 'only customers linked to this user',
        name: 'userId',
      },
      {
        flags: '--id <customerId>',
        description: 'only the customer with this id',
        name: '_id',
      },
      {
        flags: '--ids <customerIds>',
        description: 'comma-separated list of customer ids',
        name: '_ids',
      },
      {
        flags: '--fields <fields>',
        description: 'comma-separated projection of fields',
        name: 'fields',
      },
    ],
    writeFields: [
      {
        flags: '--name <name>',
        description: 'customer name as it appears on documents',
        name: 'name',
        required: true,
      },
      {
        flags: '--email <email>',
        description: 'customer email',
        name: 'email',
      },
      {
        flags: '--phone <phone>',
        description: 'customer phone number',
        name: 'phone',
      },
      {
        flags: '--language <language>',
        description:
          'two-letter language code used for documents sent to them, e.g. en',
        name: 'language',
      },
      {
        flags: '--taxId <taxId>',
        description: 'VAT / tax identification number',
        name: 'taxId',
      },
      {
        flags: '--legalEntity <legalEntity>',
        description: 'registered company name, when the customer is a company',
        name: 'legalEntity',
      },
    ],
    // The billing address is a nested object
    // ({ street, postalCode, city, state, countryCode }), so it is set
    // through --body rather than flattened into six flags.
    addDescription:
      'create a customer (POST /api/customers, fires customer.created).' +
      ' Set the address with --body \'{"address":{"street":"…","city":"…"}}\'',
    row: customer => customer.name || customer.email || customer._id,
    detail: customer => [
      ['email', customer.email],
      ['phone', customer.phone],
      ['language', customer.language],
      ['taxId', customer.taxId],
      ['legalEntity', customer.legalEntity],
      ['city', customer.address?.city],
      ['businessId', customer.businessId],
      ['created', customer.creationTime],
    ],
  })
}

module.exports = customersCommand
