/* Copyright 2025 InvoiceVista LLC */

// Production InvoiceVista API. Override with INVOICEVISTA_API_URL when
// pointing the CLI at a non-production deployment.
//
// Deliberately a three-line CLI-local module rather than
// `@invoicevista/shared/getApiUrl.js`: that one pulls in @monorepool/env,
// which carries the internal product roster. The published npm bundle must
// never contain it.
export default function getApiUrl() {
  return process.env.INVOICEVISTA_API_URL || 'https://api.invoicevista.com'
}
