/**
 * General TF2 item-name text helpers — string processing that doesn't
 * belong in utils/itemLinks.js (URL builders) or utils/tf2ItemSchema.js
 * (defindex/crate-series data and lookups).
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

/**
 * Killstreak-tier prefix text for classic backpack.tf's stats page,
 * which has no separate field for killstreak tier — see
 * utils/itemLinks.js's backpackStatsUrl() doc for why it has to be
 * baked into `name` instead. Shared here since every caller that
 * supports both bp.tf versions needs this same prefix for the classic
 * branch.
 * @param {number} ksTier
 */
export function ksPrefixFor(ksTier) {
  if (ksTier === 3) return "Professional Killstreak ";
  if (ksTier === 2) return "Specialized Killstreak ";
  if (ksTier === 1) return "Killstreak ";
  return "";
}
