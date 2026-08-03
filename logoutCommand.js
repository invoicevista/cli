/* Copyright 2025 InvoiceVista LLC */
const logoutCommand = require('@monorepool/agentfirst/logoutCommand.js')
const session = require('./session.js')
const { binaryName, envKeyName } = require('./constants.js')

// Clears everything stored in ~/.invoicevista/ — the API key secret and any
// browser-login tokens. A key exported as INVOICEVISTA_API_KEY stays in
// effect; the shared factory says so instead of silently leaving the CLI
// authenticated.
module.exports = () => logoutCommand({ binaryName, session, envKeyName })
