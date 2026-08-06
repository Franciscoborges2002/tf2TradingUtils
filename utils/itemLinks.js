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

/**
 * Steam Market and mannco.store both key off the item's full descriptive
 * name — quality word included (e.g. "Strange Australium Flame Thrower",
 * "Genuine Short Circuit") — unlike backpack.tf's stats page, which takes
 * quality as its own separate field. Some sites' DOM doesn't always show
 * the quality word as literal text in the name (Genuine in particular),
 * so this prepends it if it's missing rather than assuming it's there.
 * Internal helper — steamMarketUrl() and mannCoStoreUrl() apply this
 * themselves when given a `quality`, callers don't need to call it.
 */
function ensureQualityPrefix(name, quality) {
  const trimmed = name.trim();
  if (!quality || quality === "Unique" || quality === "Unusual") return trimmed;
  return trimmed.startsWith(`${quality} `) ? trimmed : `${quality} ${trimmed}`;
}

/**
 * Steam Community Market listing for an item.
 * @param {string} name - item name (quality prefix present or not)
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures the name starts with this quality word
 */
export function steamMarketUrl(name, quality) {
  const fullName = ensureQualityPrefix(name, quality);
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
 * @param {string} opts.name - base item name, no quality/Non-Craftable prefix. For classic backpack.tf (next: false), bake any killstreak-tier prefix ("Killstreak ", "Specialized Killstreak ", "Professional Killstreak ") into this directly — the classic URL has no separate field for it.
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
 * @param {string} [opts.quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {string} [opts.effectName] - Unusual effect name, e.g. "Frostbite"
 * @param {number} [opts.appId] - defaults to TF2
 */
export function mannCoStoreUrl({ name, quality, effectName, appId = TF2_APPID }) {
  const qualifiedName = ensureQualityPrefix(name, quality);
  const fullName = effectName ? `${effectName} ${qualifiedName}` : qualifiedName;
  const slug = fullName
    .replace(/non-craftable/gi, "Uncraftable")
    .toLowerCase()
    .replace(/'/g, " ")
    .replace(/\:/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `https://mannco.store/item/${appId}-${slug}`;
}

// name (schema's item_name, no quality/killstreak/etc. prefix) -> defindex.
// Bundled locally (utils/data/tf2ItemDefindexes.json, ~180KB) rather than
// fetched from a live API, extracted from schema.autobot.tf's full TF2
// schema. Many weapon names map to more than one defindex — most
// commonly a "stock" class-loadout defindex (item_quality 0, untradeable)
// alongside the actual tradable one (item_quality 6, Unique), e.g. Knife
// is both 4 (stock) and 194 (tradable). Picking the wrong one is exactly
// how a Strange/Australium Knife link used to resolve to the stock
// defindex instead of the real one — so wherever a name has a
// quality-6 candidate, that one is used; only names with none (no
// tradable version exists at all) fall back to whichever defindex the
// schema listed first.
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
  if (australium) sku.push("australium");
  if (ksTier) sku.push(`kt-${ksTier}`);
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