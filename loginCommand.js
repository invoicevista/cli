/* Copyright 2025 InvoiceVista LLC */
import loginCommand from '@monorepool/agentfirst/loginCommand.js'

import { appUrl, binaryName, envKeyName } from './constants.js'
import getApiUrl from './getApiUrl.js'
import packageJson from './package.json' with { type: 'json' }
import api from './request.js'
import session from './session.js'

// Verifies a pasted key with the cheapest read the API offers. New keys start
// with every :read scope, so customers:read is normally present. Resolving
// (instead of throwing) on a scope gap keeps a narrowly-scoped key stored — a
// missing scope is a permissions choice, not a bad secret.
async function verify() {
  try {
    const customers = await api.get('/api/customers?fields=_id')

    return `Logged in — ${customers.length} customer(s) visible with this key.`
  } catch (error) {
    if (error.status === 403 && String(error.message).includes('scope')) {
      return (
        'Key stored. It lacks the customers:read scope, so it could not be' +
        ' verified — commands within its granted scopes will still work.'
      )
    }

    if (error.status === 401 || error.status === 403) {
      throw error
    }

    return `Key stored, but the verification call failed: ${error.message}`
  }
}

// `invoicevista login` via the shared factory: `--browser` opens
// app.invoicevista.com/cli and stores a token session (the same run also prints
// a one-time code, so it can be finished from another device); `--device`
// approves that code from a phone or another computer, with no browser on this
// machine; `--with-key` prompts (masked) for an API key secret. Headless with
// no flags it fails fast with instructions instead of hanging on a prompt or
// opening a browser.
export default () =>
  loginCommand({
    binaryName,
    appUrl,
    getApiUrl,
    version: packageJson.version,
    session,
    verify,
    envKeyName,
  })
