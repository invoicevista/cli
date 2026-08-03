/* Copyright 2025 InvoiceVista LLC */

// Every InvoiceVista write needs a businessId: an organization can hold
// several businesses, and each invoice, quote, customer, product and payment
// belongs to exactly one of them. A key minted for one business supplies it
// implicitly (withKey puts it on response.locals); an organization-wide
// session must send it. On update, when the caller passed no --businessId,
// reuse the businessId of the stored record — one extra read, and it needs
// the matching `:read` scope.
module.exports = async function resolveBusinessId(options, body, getExisting) {
  let businessId = options.businessId || body.businessId

  if (!businessId) {
    const existing = await getExisting()
    businessId = existing?.businessId
  }

  return businessId
}
