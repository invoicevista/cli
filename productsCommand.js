/* Copyright 2025 InvoiceVista LLC */
import resourceCommand from './resourceCommand.js'

// Products are the catalogue an invoice or quote line is picked from — a
// name, a description and a unit price.
function productsCommand() {
  return resourceCommand({
    name: 'products',
    singular: 'product',
    path: '/api/products',
    description:
      'manage your product and service catalogue (products:read / products:write)',
    filters: [
      {
        flags: '--businessId <businessId>',
        description: 'only products of this business',
        name: 'businessId',
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
        description: 'field to sort by, e.g. name or creationTime',
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
    ],
    writeFields: [
      {
        flags: '--name <name>',
        description: 'product or service name',
        name: 'name',
        required: true,
      },
      {
        flags: '--price <price>',
        description: 'unit price, in the currency of the business',
        name: 'price',
        coerce: Number,
      },
      {
        flags: '--description <description>',
        description: 'longer description shown on documents',
        name: 'description',
      },
    ],
    row: product =>
      [product.name || product._id, product.price]
        .filter(value => value !== undefined && value !== null && value !== '')
        .join(' — '),
    detail: product => [
      ['price', product.price],
      ['description', product.description],
      ['businessId', product.businessId],
      ['created', product.creationTime],
    ],
  })
}

export default productsCommand
