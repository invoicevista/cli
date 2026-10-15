/* Copyright 2025 InvoiceVista LLC */
import logoutCommand from '@monorepool/agentfirst/logoutCommand.js'

import { binaryName, envKeyName } from './constants.js'
import session from './session.js'

// Clears everything stored in ~/.invoicevista/ — the API key secret and any
// browser-login tokens. A key exported as INVOICEVISTA_API_KEY stays in
// effect; the shared factory says so instead of silently leaving the CLI
// authenticated.
export default () => logoutCommand({ binaryName, session, envKeyName })
