// Kept in sync by hand with tiers.mjs in vault-subscription-status and
// vault-scans-create — each Lambda is self-contained (see backend/README.md),
// so this small config is duplicated rather than shared via a layer.
export const TIERS = {
  solo: { name: "Solo", priceCents: 3900, scanCap: 20, seats: 1 },
  crew: { name: "Crew", priceCents: 9900, scanCap: 100, seats: 3 },
  company: { name: "Company", priceCents: 24900, scanCap: Infinity, seats: 10 },
};
