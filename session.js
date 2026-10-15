/* Copyright 2025 InvoiceVista LLC */
import createSessionStore from '@monorepool/agentfirst/sessionStore.js'

// ~/.invoicevista/ holds both credentials the CLI can carry: the browser
// login's accessToken + refreshToken, and an API key secret pasted through
// `invoicevista login --with-key`. The directory is only created on first
// use — `invoicevista --help` leaves nothing behind.
export default createSessionStore({ productDirName: 'invoicevista' })
