#!/usr/bin/env node
/* Copyright 2025 InvoiceVista LLC */

import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import skillsCommand from '@monorepool/agentfirst/skillsCommand.js'
import { program } from 'commander'

import businessesCommand from './businessesCommand.js'
import customersCommand from './customersCommand.js'
import invoicesCommand from './invoicesCommand.js'
import keysCommand from './keysCommand.js'
import loginCommand from './loginCommand.js'
import logoutCommand from './logoutCommand.js'
import packageJson from './package.json' with { type: 'json' }
import paymentsCommand from './paymentsCommand.js'
import productsCommand from './productsCommand.js'
import quotesCommand from './quotesCommand.js'
import schemaCommand from './schemaCommand.js'
import signupCommand from './signupCommand.js'
import webhooksCommand from './webhooksCommand.js'

const cliDirectory = fileURLToPath(new URL('.', import.meta.url))

function isDirectRun() {
  return Boolean(
    process.argv[1] &&
    existsSync(process.argv[1]) &&
    import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href,
  )
}

program
  .name('invoicevista')
  .description(
    'invoicevista cli — manage the invoices, quotes, customers,' +
      ' products and payments of your business from the terminal',
  )
  .version(packageJson.version)
  .addCommand(signupCommand())
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(businessesCommand())
  .addCommand(customersCommand())
  .addCommand(productsCommand())
  .addCommand(invoicesCommand())
  .addCommand(quotesCommand())
  .addCommand(paymentsCommand())
  .addCommand(webhooksCommand())
  .addCommand(keysCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(skillsCommand({ baseDirectory: cliDirectory }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
if (isDirectRun()) program.parse(process.argv)

export default program
