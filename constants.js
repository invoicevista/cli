/* Copyright 2025 InvoiceVista LLC */

// The per-product configuration every @monorepool/agentfirst factory needs.
//
// INVOICEVISTA_API_KEY is read from the environment at request time; a stored
// login (browser session or pasted key) always wins over it, so a globally
// exported key cannot silently hijack an interactive session.
module.exports = {
  binaryName: 'invoicevista',
  appUrl: 'https://app.invoicevista.com',
  envKeyName: 'INVOICEVISTA_API_KEY',
}
