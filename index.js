#!/usr/bin/env node
/* Copyright 2025 InvoiceVista LLC */
const program = require('commander')
const skillsCommand = require('@monorepool/agentfirst/skillsCommand.js')
const businessesCommand = require('./businessesCommand.js')
const customersCommand = require('./customersCommand.js')
const invoicesCommand = require('./invoicesCommand.js')
const keysCommand = require('./keysCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const paymentsCommand = require('./paymentsCommand.js')
const productsCommand = require('./productsCommand.js')
const quotesCommand = require('./quotesCommand.js')
const schemaCommand = require('./schemaCommand.js')
const signupCommand = require('./signupCommand.js')
const webhooksCommand = require('./webhooksCommand.js')
const packageJson = require('./package.json')

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
  .addCommand(skillsCommand({ baseDirectory: __dirname }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
program.parse(process.argv)
