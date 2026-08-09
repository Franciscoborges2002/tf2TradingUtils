/**
 * Item-specific naming quirks that can't be derived generically —
 * confirmed by testing real URLs, not guessed. Keyed by the item's base
 * name (no quality/killstreak/Festivized/Non-Craftable — matches TF2's
 * own schema convention, e.g. the keys in utils/data/tf2ItemDefindexes.json).
 *
 * There's no way to derive any of this algorithmically (Valve's own
 * schema doesn't store "The" as part of item_name at all, and mannco.store's
 * short names are just whatever mannco.store decided to use) — add to
 * this as more quirky items are found.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 *
 * @typedef {object} ItemNameQuirk
 * @property {boolean} [steamMarketNeedsThePrefix] - Steam Community Market needs "The " prepended — but ONLY for the plain (no killstreak) version; killstreak variants drop it again (confirmed for C.A.P.P.E.R)
 * @property {boolean} [steamMarketOmitsNonCraftablePrefix] - Steam Community Market's listing name drops "Non-Craftable " even though the item itself is Non-Craftable — true for reward/unlock crates (e.g. "Unlocked Cosmetic Crate Multi-Class"), which have no craftable variant to disambiguate from in the first place
 * @property {string} [manncoStoreName] - mannco.store uses this short name instead of the item's real name (e.g. "Capper" instead of "C.A.P.P.E.R"). Apostrophes don't need a quirk entry for this anymore — mannCoStoreUrl() strips them outright now (see utils/itemLinks.js).
 * @property {boolean} [manncoStoreNeedsThePrefix] - same "The"-only-when-no-killstreak rule as steamMarketNeedsThePrefix, but tracked separately per site — confirmed independently, not assumed to match
 * @property {string} [backpackName] - backpack.tf needs this exact casing instead of the name as some site displays it (e.g. "Force-a-Nature" — lowercase "a" — not "Force-A-Nature", which is how stntrading.eu auto-capitalizes it)
 * @property {boolean} [skinportNeedsThePrefix] - skinport.com needs "The " prepended — but ONLY when no quality word leads the name (confirmed for Quäckenbirdt: the unqualified version is "the-qu-ckenbirdt", but the Genuine version is "genuine-qu-ckenbirdt", with no "the" at all). Tracked separately from manncoStoreNeedsThePrefix — confirmed NOT to always match it.
 */

/** @type {Record<string, ItemNameQuirk>} */
export const ITEM_NAME_QUIRKS = {
  "C.A.P.P.E.R": {
    steamMarketNeedsThePrefix: true,
    manncoStoreName: "Capper",
    manncoStoreNeedsThePrefix: true,
  },
  "Dead Head": {
    manncoStoreNeedsThePrefix: true,
    steamMarketNeedsThePrefix: true,
  },
  "Quäckenbirdt": {
    manncoStoreNeedsThePrefix: true,
    skinportNeedsThePrefix: true,
  },
  "Festivizer": {
    manncoStoreNeedsThePrefix: true,
  },
  "Conscientious Objector": {
    skinportNeedsThePrefix: true,
  },
  "AWPer Hand": {
    skinportNeedsThePrefix: true,
  },
  "Sharp Dresser": {
    skinportNeedsThePrefix: true,
  },
  "Nostromo Napalmer": {
    skinportNeedsThePrefix: true,
  },
  "Maul": {
    skinportNeedsThePrefix: true,
  },
  "Ham Shank": {
    skinportNeedsThePrefix: true,
  },
  "Frying Pan": {
    skinportNeedsThePrefix: true,
  },
  // Keyed by stntrading.eu's own (wrongly-capitalized) casing — see
  // backpackName above.
  "Force-A-Nature": {
    backpackName: "Force-a-Nature",
  },
  "Unlocked Cosmetic Crate Multi-Class": {
    steamMarketOmitsNonCraftablePrefix: true,
  },
};
