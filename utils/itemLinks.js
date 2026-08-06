/**
 * Shared builders for external TF2 item-info URLs (Steam Market,
 * backpack.tf, stntrading.eu, the TF2 Wiki), so every site's content
 * script produces the same URL shapes instead of each hand-rolling
 * its own string concatenation.
 *
 * Each site keeps its own item name/quality/craftability parsing —
 * that part depends on whatever markup that particular site renders —
 * and just calls these with the normalized result.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

import { TF2_APPID, TF2_QUALITY_IDS } from "./constants/tf2Economy.js";

/** Steam Community Market listing for an item (full name, quality prefix included). */
export function steamMarketUrl(fullName) {
  return `https://steamcommunity.com/market/listings/${TF2_APPID}/${encodeURIComponent(fullName)}`;
}

/** TF2 Wiki page for an item (full name). */
export function wikiUrl(fullName) {
  return `https://wiki.teamfortress.com/wiki/${encodeURIComponent(fullName)}`;
}

/**
 * backpack.tf (or next.backpack.tf) stats page for an item.
 *
 * The two sites use genuinely different URL shapes for this page —
 * classic backpack.tf is path-segment based; next.backpack.tf is
 * query-param based (and has no per-Unusual-effect filtering) —
 * confirmed against scrap.tf/ItemLinks's already-working next.backpack.tf
 * link, so `next: true` always builds that shape now.
 *
 * @param {object} opts
 * @param {string} opts.name - base item name, no quality/killstreak/Non-Craftable prefix
 * @param {string} [opts.quality="Unique"]
 * @param {boolean} [opts.craftable=true]
 * @param {string|number} [opts.effectId] - Unusual effect id, appended as a trailing path segment (classic backpack.tf only — next.backpack.tf's stats query has no equivalent)
 * @param {number} [opts.ksTier] - killstreak tier (next.backpack.tf only; classic backpack.tf expects it baked into `name` instead)
 * @param {boolean} [opts.australium] - next.backpack.tf only, and only ever sent when true (matches the confirmed-working link, which omits it otherwise)
 * @param {boolean} [opts.next=false] - use next.backpack.tf instead of backpack.tf
 */
export function backpackStatsUrl({ name, quality = "Unique", craftable = true, effectId, ksTier, australium, next = false }) {
  const craftParam = craftable ? 1 : -1;

  if (next) {
    const qualityId = TF2_QUALITY_IDS[quality] ?? TF2_QUALITY_IDS.Unique;
    let url = `https://next.backpack.tf/stats?item=${encodeURIComponent(name)}&quality=${qualityId}&tradable=1&craftable=${craftParam}`;
    if (australium) url += `&australium=1`;
    url += `&killstreakTier=${ksTier ?? 0}`;
    return url;
  }

  const craftSegment = craftable ? "Craftable" : "Non-Craftable";
  let url = `https://backpack.tf/stats/${encodeURIComponent(quality)}/${encodeURIComponent(name)}/Tradable/${craftSegment}`;
  if (effectId != null) url += `/${effectId}`;
  return url;
}

/**
 * backpack.tf (or next.backpack.tf) classifieds search for an item.
 * Unlike the stats page, this is query-param based and needs the
 * numeric quality id (not the quality name) plus killstreak tier.
 *
 * @param {object} opts
 * @param {string} opts.name - item name (classic backpack.tf strips the Australium prefix itself, so pass it without "Australium ")
 * @param {number} opts.qualityId
 * @param {boolean} [opts.craftable=true]
 * @param {boolean} [opts.australium] - omitted from the query entirely when not given
 * @param {number} [opts.ksTier=0]
 * @param {boolean} [opts.next=false] - use next.backpack.tf instead of backpack.tf
 */
export function backpackClassifiedsUrl({ name, qualityId, craftable = true, australium, ksTier = 0, next = false }) {
  const base = next ? "https://next.backpack.tf/classifieds" : "https://backpack.tf/classifieds";
  const itemParam = next ? "itemName" : "item";
  const ksParam = next ? "killstreakTier" : "killstreak_tier";
  const craftParam = craftable ? 1 : -1;

  let url = `${base}?${itemParam}=${encodeURIComponent(name)}&quality=${qualityId}&tradable=1&craftable=${craftParam}`;
  if (australium != null) url += `&australium=${australium ? 1 : -1}`;
  url += `&${ksParam}=${ksTier}`;
  return url;
}

/**
 * stntrading.eu item page.
 *
 * Spaces are encoded as "+" (not %20), colons as %3A and apostrophes
 * as %27 — that's the URL shape stntrading.eu actually expects,
 * reverse-engineered from the site itself rather than documented
 * anywhere.
 *
 * @param {object} opts
 * @param {string} opts.name - full item name (quality prefix included, as stntrading.eu shows it)
 * @param {boolean} [opts.craftable=true]
 */
export function stnTradingUrl({ name, craftable = true }) {
  const encoded = name
    .replace(/:/g, "%3A")
    .replace(/'/g, "%27")
    .replace(/ /g, "+");
  const prefix = craftable ? "" : "Non-Craftable+";
  return `https://stntrading.eu/item/tf2/${prefix}${encoded}`;
}

/**
 * mannco.store item page.
 *
 * The slug is just the full item name (quality/killstreak/Collector's/
 * Festivized prefixes included, in the same order Steam itself shows
 * them) lowercased, with apostrophes turned into a word break and
 * every run of whitespace turned into a single "-". e.g. "Collector's
 * Festivized Professional Killstreak Beggar's Bazooka" becomes
 * "collector-s-festivized-professional-killstreak-beggar-s-bazooka".
 *
 * Unusuals are the one exception: Steam's own item name never includes
 * the effect (it's "Unusual Virtual Viewfinder", with the effect only
 * shown separately, e.g. "Effect: Frostbite") but mannco.store's slug
 * puts the effect name first — pass it via `effectName` and it's
 * prepended before the rest of the name.
 *
 * Non-craftable items are also a special case: Steam's "Non-Craftable"
 * text becomes the single word "uncraftable" instead of the two words
 * "non-craftable" straight lowercasing would produce, e.g.
 * "Non-Craftable Tour of Duty Ticket" -> "uncraftable-tour-of-duty-ticket".
 *
 * @param {object} opts
 * @param {string} opts.name - full item name, as Steam displays it (no effect name) — include "Non-Craftable " if applicable
 * @param {string} [opts.effectName] - Unusual effect name, e.g. "Frostbite"
 * @param {number} [opts.appId] - defaults to TF2
 */
export function mannCoStoreUrl({ name, effectName, appId = TF2_APPID }) {
  const fullName = effectName ? `${effectName} ${name}` : name;
  const slug = fullName
    .replace(/non-craftable/gi, "Uncraftable")
    .toLowerCase()
    .replace(/'/g, " ")
    .trim()
    .replace(/\s+/g, "-");
  return `https://mannco.store/item/${appId}-${slug}`;
}

// name (schema's item_name, no quality/killstreak/etc. prefix) -> defindex.
// Bundled locally (utils/data/tf2ItemDefindexes.json, ~180KB) rather than
// fetched from a live API, extracted from schema.autobot.tf's full TF2
// schema. A few hundred names (mostly untradeable stock class weapons,
// plus Mann Co. Supply Crate Key's many historical reissues) map to more
// than one defindex — the first one found in the schema is used, which
// for Keys lands on the defindex (5021) everyone else's pricing already
// keys off of.
let defindexSchemaPromise = null;
function loadDefindexSchema() {
  if (!defindexSchemaPromise) {
    defindexSchemaPromise = fetch(
      chrome.runtime.getURL("utils/data/tf2ItemDefindexes.json")
    ).then((res) => res.json());
  }
  return defindexSchemaPromise;
}

/** Looks up an item's defindex from the bundled schema (see loadDefindexSchema above). Returns null if not found. */
export async function getItemDefindex(name) {
  const schema = await loadDefindexSchema();
  return schema[name] ?? null;
}

/**
 * marketplace.tf item page — the one site here that's keyed by "sku"
 * (defindex;quality[;modifiers]) rather than a name-based slug, so this
 * needs a name -> defindex schema lookup and is async.
 *
 * @param {object} opts
 * @param {string} opts.name - base item name, no quality/killstreak/Non-Craftable prefix (matches the TF2 schema's own item_name)
 * @param {string} [opts.quality="Unique"]
 * @param {boolean} [opts.craftable=true]
 * @param {number} [opts.ksTier] - killstreak tier (1 basic, 2 specialized, 3 professional)
 * @param {boolean} [opts.australium=false]
 * @param {boolean} [opts.festive=false]
 * @param {string|number} [opts.effectId] - Unusual effect id
 * @returns {Promise<string|null>} null if the item name isn't in the schema
 */
export async function marketplaceTfUrl({
  name, quality = "Unique", craftable = true, ksTier, australium = false, festive = false, effectId,
}) {
  const schema = await loadDefindexSchema();
  const defindex = schema[name];
  if (defindex == null) return null;

  const qualityId = TF2_QUALITY_IDS[quality] ?? TF2_QUALITY_IDS.Unique;
  const sku = [defindex, qualityId];

  if (!craftable) sku.push("uncraftable");
  if (ksTier) sku.push(`kt-${ksTier}`);
  if (australium) sku.push("australium");
  if (festive) sku.push("festive");
  if (effectId != null) sku.push(`u${effectId}`);

  return `https://marketplace.tf/items/tf2/${sku.join(";")}`;
}

/** posts.tf's plain search results page — no query params, since it doesn't read search state from the URL. */
export const POSTS_TF_SEARCH_RESULTS_URL = "https://posts.tf/posts/search/results";

/**
 * posts.tf search request body.
 *
 * posts.tf's search isn't URL-driven — the site itself only exposes a
 * POST https://posts.tf/api/posts/search?page=N endpoint, taking this
 * body. So there's no link to build; the caller sends this to
 * background.js (SET_POSTS_TF_SEARCH) before navigating to
 * POSTS_TF_SEARCH_RESULTS_URL, and posts.tf/autoSearch/content.js
 * reads it back (GET_POSTS_TF_SEARCH) once loaded there and issues the
 * request itself — same-origin at that point, no CORS/host permission
 * needed the way a cross-origin fetch from another site would require.
 *
 * @param {Array<{defindex: number, quality: number}>} userItems
 * @param {object} [opts]
 * @param {Array<{defindex: number, quality: number}>} [opts.partnerItems]
 * @param {string} [opts.description]
 * @param {boolean} [opts.matchAllItems]
 */
export function postsTfSearchPayload(userItems, { partnerItems = [], description = "", matchAllItems = false } = {}) {
  return { userItems, partnerItems, description, matchAllItems };
}