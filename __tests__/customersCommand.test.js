/* Copyright 2025 InvoiceVista LLC */

import { stripVTControlCharacters } from 'node:util'

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import customersCommand from '../customersCommand.js'
import api from '../request.js'

vi.mock('../request.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@monorepool/agentfirst/output.js', async importOriginal => ({
  ...(await importOriginal()),
  printJson: vi.fn(),
  fail: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const run = args =>
  customersCommand().exitOverride().parseAsync(args, { from: 'user' })
const contact = {
  name: 'Alex Example',
  email: 'customer@example.test',
  phone: '+123',
  language: 'en',
  taxId: 'synthetic-tax-id',
  legalEntity: 'Example LLC',
}
const contactOptions = Object.entries(contact).flatMap(([key, value]) => [
  `--${key}`,
  value,
])

it('lists exact business, contact, ID and projection filters without inventing pagination', async () => {
  const customers = [{ _id: 'one', name: 'Alex' }]
  api.get.mockResolvedValue(customers)
  await run([
    'list',
    '--businessId',
    'business',
    '--email',
    'a+b@example.test',
    '--ids',
    'one,two',
    '--userId',
    'user',
    '--fields',
    'name,email',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/customers?businessId=business&email=a%2Bb%40example.test&userId=user&_ids=one%2Ctwo&fields=name%2Cemail',
  )
  expect(printJson).toHaveBeenCalledExactlyOnceWith(customers)
  expect(fail).not.toHaveBeenCalled()
})

it('omits absent filters rather than appending a query marker', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/customers')
  expect(printJson).toHaveBeenCalledExactlyOnceWith([])
})

it.each(['get', 'read'])(
  'returns the complete raw record for %s --json',
  async action => {
    const customer = { _id: 'one', ...contact }
    api.get.mockResolvedValue(customer)
    await run([action, 'one', '--json'])
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/customers/one')
    expect(printJson).toHaveBeenCalledExactlyOnceWith(customer)
  },
)

it.each([false, true])(
  'creates with explicit fields taking precedence, json=%j',
  async json => {
    const customer = { _id: 'created', businessId: 'business', ...contact }
    api.post.mockResolvedValue(customer)
    await run([
      'add',
      '--businessId',
      'business',
      ...contactOptions,
      '--body',
      JSON.stringify({
        businessId: 'other',
        ...Object.fromEntries(
          Object.keys(contact).map(key => [key, 'overridden']),
        ),
        note: 'keep',
      }),
      ...(json ? ['--json'] : []),
    ])
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/customers', {
      businessId: 'business',
      ...contact,
      note: 'keep',
    })
    expect(printJson).toHaveBeenCalledExactlyOnceWith(
      json ? { ok: true, id: 'created' } : customer,
    )
  },
)

it('does not invent optional contact fields on a minimal create', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run(['add', '--name', 'Alex', '--businessId', 'business', '--json'])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/customers', {
    businessId: 'business',
    name: 'Alex',
  })
})

it.each([false, true])(
  'updates with path and explicit field precedence, json=%j',
  async json => {
    const customer = { _id: 'one', businessId: 'body-business', ...contact }
    api.put.mockResolvedValue(customer)
    await run([
      'update',
      'one',
      ...contactOptions,
      '--body',
      JSON.stringify({
        _id: 'other',
        businessId: 'body-business',
        ...Object.fromEntries(
          Object.keys(contact).map(key => [key, 'overridden']),
        ),
        note: 'keep',
      }),
      ...(json ? ['--json'] : []),
    ])
    expect(api.get).not.toHaveBeenCalled()
    expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/customers/one', {
      ...customer,
      note: 'keep',
    })
    expect(printJson).toHaveBeenCalledExactlyOnceWith(
      json ? { ok: true, id: 'one' } : customer,
    )
  },
)

it('uses the explicit business option ahead of the body without reading the record', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--businessId',
    'chosen',
    '--body',
    '{"businessId":"other"}',
    '--json',
  ])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/customers/one', {
    _id: 'one',
    businessId: 'chosen',
  })
})

it('looks up the existing business exactly once when neither option nor body supplies it', async () => {
  api.get.mockResolvedValue({ businessId: 'existing' })
  api.put.mockResolvedValue({ _id: 'one' })
  await run(['update', 'one', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/customers/one')
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/customers/one', {
    _id: 'one',
    businessId: 'existing',
  })
})

it('leaves a missing business to server validation without fabricating one', async () => {
  api.get.mockResolvedValue(null)
  api.put.mockResolvedValue({ _id: 'one' })
  await run(['update', 'one', '--json'])
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/customers/one', {
    _id: 'one',
  })
})

it.each([
  ['add', '--name', 'Alex', '--businessId', 'business'],
  ['update', 'one'],
])('rejects malformed JSON before any write for %j', async (...args) => {
  await run([...args, '--body', '{', '--json'])
  expect(api.post).not.toHaveBeenCalled()
  expect(api.put).not.toHaveBeenCalled()
  expect(api.get).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      message: expect.stringContaining('--body is not valid JSON:'),
    }),
    { json: true },
  )
})

it('stops an update when the business lookup fails', async () => {
  const error = new Error('synthetic lookup denied')
  api.get.mockRejectedValue(error)
  await run(['update', 'one', '--json'])
  expect(api.put).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it.each([['list'], ['get', 'one'], ['read', 'one']])(
  'preserves read failures for %j',
  async (...args) => {
    const error = Object.assign(new Error('synthetic denied'), { status: 403 })
    api.get.mockRejectedValue(error)
    await run([...args, '--json'])
    expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
    expect(printJson).not.toHaveBeenCalled()
  },
)

it('deletes each requested ID and reports all successes', async () => {
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/customers/one'],
    ['/api/customers/two'],
  ])
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: true,
    deleted: ['one', 'two'],
  })
})

it('reports partial deletion without including a failed ID', async () => {
  const error = new Error('synthetic deletion denied')
  api.del.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/customers/one'],
    ['/api/customers/two'],
  ])
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: false,
    deleted: ['two'],
  })
})

it('prints human deletion results without JSON', async () => {
  await run(['delete', 'one', 'two'])
  expect(console.log.mock.calls).toEqual([['deleted one'], ['deleted two']])
  expect(printJson).not.toHaveBeenCalled()
})

it('prints an empty customer list', async () => {
  api.get.mockResolvedValue([])
  await run(['list'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('No customers found')
})

it('renders name precedence, contact details and the ID fallback', async () => {
  api.get.mockResolvedValue([
    { _id: 'one', ...contact, name: 'Display Name' },
    { _id: 'two', email: 'customer@example.test' },
    { _id: 'three' },
  ])
  await run(['list'])
  expect(console.log.mock.calls).toEqual([
    ['Found 3 customers:'],
    ['1. Display Name (one)'],
    ['2. customer@example.test (two)'],
    ['3. three (three)'],
  ])
})

it('prints a missing customer in human mode', async () => {
  api.get.mockResolvedValue(null)
  await run(['read', 'one'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('customer not found')
})

it('renders all supplied customer details without JSON', async () => {
  api.get.mockResolvedValue({
    _id: 'one',
    ...contact,
    businessId: 'business',
    creationTime: '2026-01-01T00:00:00Z',
  })
  await run(['read', 'one'])
  expect(
    console.log.mock.calls.map(args => args.map(stripVTControlCharacters)),
  ).toEqual([
    [],
    ['Alex Example'],
    ['one'],
    [],
    ['email  customer@example.test'],
    ['phone  +123'],
    ['language  en'],
    ['taxId  synthetic-tax-id'],
    ['legalEntity  Example LLC'],
    ['businessId  business'],
    ['created  2026-01-01T00:00:00Z'],
    [],
  ])
  expect(printJson).not.toHaveBeenCalled()
})

it.each([
  { _id: 'one' },
  { _id: 'one', name: 'Display Name', firstName: 'Ignored' },
])('uses display-name or ID fallback for %j', async customer => {
  api.get.mockResolvedValue(customer)
  await run(['read', 'one'])
  expect(
    console.log.mock.calls.map(args => args.map(stripVTControlCharacters)),
  ).toEqual([[], [customer.name || 'one'], ['one'], [], []])
})
