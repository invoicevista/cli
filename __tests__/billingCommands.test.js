/* Copyright 2025 InvoiceVista LLC */
import { stripVTControlCharacters } from 'node:util'

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import invoicesCommand from '../invoicesCommand.js'
import paymentsCommand from '../paymentsCommand.js'
import productsCommand from '../productsCommand.js'
import quotesCommand from '../quotesCommand.js'
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

const documents = [
  ['invoices', invoicesCommand, 'Invoice'],
  ['quotes', quotesCommand, 'Quote'],
  ['payments', paymentsCommand, 'Payment'],
]
const run = (factory, args) =>
  factory().exitOverride().parseAsync(args, { from: 'user' })

it.each(documents)(
  'forwards every documented %s list filter',
  async (name, factory) => {
    api.get.mockResolvedValue([])
    await run(factory, [
      'list',
      '--businessId',
      'business',
      '--customerId',
      'customer',
      '--issueStartTime',
      '2026-01-01',
      '--issueEndTime',
      '2026-02-01',
      '-n',
      '0',
      '--skip',
      '2',
      '--sortField',
      'issueTime',
      '--sortDirection',
      'ASC',
      '--fields',
      '_id,number',
      '--json',
    ])
    expect(api.get).toHaveBeenCalledExactlyOnceWith(
      `/api/${name}?businessId=business&customerId=customer&issueStartTime=2026-01-01&issueEndTime=2026-02-01&limit=0&skip=2&sortField=issueTime&sortDirection=ASC&fields=_id%2Cnumber`,
    )
    expect(printJson).toHaveBeenCalledExactlyOnceWith([])
    const list = factory().commands.find(command => command.name() === 'list')
    expect(list.options.map(option => option.long)).not.toContain('--startTime')
    expect(list.options.map(option => option.long)).not.toContain('--endTime')
  },
)

it.each(documents)(
  'preserves nested lines and explicit fields on %s creation',
  async (name, factory) => {
    const lines = [{ item: 'Synthetic service', quantity: 2, unitPrice: 12.5 }]
    api.post.mockResolvedValue({ _id: 'created' })
    await run(factory, [
      'add',
      '--businessId',
      'business',
      '--customerId',
      'customer',
      '--issueTime',
      '2026-01-01',
      '--dueTime',
      '2026-02-01',
      '--note',
      'note',
      '--body',
      JSON.stringify({
        lines,
        discount: { value: 1 },
        customerId: 'overridden',
      }),
      '--json',
    ])
    expect(api.post).toHaveBeenCalledExactlyOnceWith(`/api/${name}`, {
      lines,
      discount: { value: 1 },
      businessId: 'business',
      customerId: 'customer',
      issueTime: '2026-01-01',
      dueTime: '2026-02-01',
      note: 'note',
    })
    expect(printJson).toHaveBeenCalledExactlyOnceWith({
      ok: true,
      id: 'created',
    })
    expect(api.get).not.toHaveBeenCalled()
  },
)

it.each(documents)(
  'renders %s document labels and detail fields',
  async (_name, factory, label) => {
    api.get.mockResolvedValue({
      _id: 'document',
      number: '7',
      status: 'DRAFT',
      customerId: 'customer',
      issueTime: '2026-01-01',
      dueTime: '2026-02-01',
      lines: [],
      note: 'note',
      businessId: 'business',
      creationTime: '2025-12-31',
    })
    await run(factory, ['read', 'document'])
    expect(
      console.log.mock.calls.map(args => args.map(stripVTControlCharacters)),
    ).toEqual([
      [],
      [`${label} 7 · DRAFT · 2026-01-01`],
      ['document'],
      [],
      ['status  DRAFT'],
      ['customerId  customer'],
      ['issueTime  2026-01-01'],
      ['dueTime  2026-02-01'],
      ['lines  0'],
      ['note  note'],
      ['businessId  business'],
      ['created  2025-12-31'],
      [],
    ])
  },
)

it.each(documents)(
  'uses the %s label when optional document fields are absent',
  async (_name, factory, label) => {
    api.get.mockResolvedValue([{ _id: 'document' }])
    await run(factory, ['list'])
    expect(console.log).toHaveBeenLastCalledWith(`1. ${label} (document)`)
  },
)

it('documents the authored status vocabularies without adding a payment status', () => {
  for (const [factory, description] of [
    [
      invoicesCommand,
      'one of DRAFT, PENDING, PARTIALLY_PAID, PAID, OVERDUE, REFUNDED, UNCOLLECTIBLE',
    ],
    [quotesCommand, 'one of DRAFT, PENDING, REJECTED, APPROVED'],
  ]) {
    const add = factory().commands.find(command => command.name() === 'add')
    expect(
      add.options.find(option => option.long === '--status').description,
    ).toBe(description)
  }
  const add = paymentsCommand().commands.find(
    command => command.name() === 'add',
  )
  expect(add.options.map(option => option.long)).not.toContain('--status')
})

it.each(['0', '12.5'])(
  'coerces a product price %s into a number',
  async price => {
    api.post.mockResolvedValue({ _id: 'product' })
    await run(productsCommand, [
      'add',
      '--name',
      'Synthetic',
      '--price',
      price,
      '--description',
      'Description',
      '--businessId',
      'business',
      '--json',
    ])
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/products', {
      name: 'Synthetic',
      price: Number(price),
      description: 'Description',
      businessId: 'business',
    })
  },
)

it('passes product pagination without inventing defaults', async () => {
  api.get.mockResolvedValue([])
  await run(productsCommand, [
    'list',
    '--businessId',
    'business',
    '-n',
    '0',
    '--skip',
    '1',
    '--sortField',
    'name',
    '--sortDirection',
    'DESC',
    '--fields',
    'name,price',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/products?businessId=business&limit=0&skip=1&sortField=name&sortDirection=DESC&fields=name%2Cprice',
  )
})

it('keeps a zero price visible and falls back to the product ID', async () => {
  api.get.mockResolvedValue([
    { _id: 'one', name: 'Free', price: 0 },
    { _id: 'two' },
  ])
  await run(productsCommand, ['list'])
  expect(console.log.mock.calls).toEqual([
    ['Found 2 products:'],
    ['1. Free — 0 (one)'],
    ['2. two (two)'],
  ])
})
