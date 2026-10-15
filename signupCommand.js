/* Copyright 2025 InvoiceVista LLC */
import signupCommand from '@monorepool/agentfirst/signupCommand.js'

import { appUrl, binaryName } from './constants.js'
import getApiUrl from './getApiUrl.js'
import session from './session.js'

// The step that used to need a person. `login` assumes the account already
// exists; an agent pointed at invoicevista.com for the first time has nothing
// to log into, and the browser flow it fell back to blocked with nobody there
// to complete it.
//
//   invoicevista signup --email founder@example.com --json
//
// drives the same public POST /api/signup the web signup form posts to, which
// creates the organization, the first business and an admin role, then stores
// the session in the same ~/.invoicevista/ the browser login writes — so
// every other command works immediately afterwards.
export default () => signupCommand({ binaryName, getApiUrl, appUrl, session })
