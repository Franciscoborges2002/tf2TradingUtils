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
 * @property {string} [manncoStoreName] - mannco.store uses this short name instead of the item's real name (e.g. "Capper" instead of "C.A.P.P.E.R"). Apostrophes don't need a quirk entry for this anymore — mannCoStoreUrl() strips them outright now (see utils/itemLinks.js).
 * @property {boolean} [manncoStoreNeedsThePrefix] - same "The"-only-when-no-killstreak rule as steamMarketNeedsThePrefix, but tracked separately per site — confirmed independently, not assumed to match
 * @property {string} [backpackName] - backpack.tf needs this exact casing instead of the name as some site displays it (e.g. "Force-a-Nature" — lowercase "a" — not "Force-A-Nature", which is how stntrading.eu auto-capitalizes it)
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
  },
  "Festivizer": {
    manncoStoreNeedsThePrefix: true,
  },
  // Keyed by stntrading.eu's own (wrongly-capitalized) casing — see
  // backpackName above.
  "Force-A-Nature": {
    backpackName: "Force-a-Nature",
  },
};
