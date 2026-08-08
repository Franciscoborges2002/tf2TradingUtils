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
 * Spaces are encoded as "+" (not %20), colons as %3A, apostrophes as
 * %27 and "#" as %23 (unlike every other site here, stntrading.eu
 * keeps a crate's "Series #N"/"#N" suffix as part of the name itself —
 * it has a separate page per series/case number, not one per crate
 * type — so that character shows up for real and has to be escaped:
 * unescaped, it'd truncate the URL at the fragment) — that's the URL
 * shape stntrading.eu actually expects, reverse-engineered from the
 * site itself rather than documented anywhere.
 *
 * @param {object} opts
 * @param {string} opts.name - full item name (quality prefix included, as stntrading.eu shows it — keep any "Series #N"/"#N" crate suffix too, unlike mannco.store/marketplace.tf's separate crate handling)
 * @param {boolean} [opts.craftable=true]
 */
export function stnTradingUrl({ name, craftable = true }) {
  const encoded = name
    .replace(/:/g, "%3A")
    .replace(/'/g, "%27")
    .replace(/#/g, "%23")
    .replace(/ /g, "+");
  const prefix = craftable ? "" : "Non-Craftable+";
  return `https://stntrading.eu/item/tf2/${prefix}${encoded}`;
}

/**
 * mannco.store item page.
 *
 * The slug is just the full item name (quality/killstreak/Collector's/
 * Festivized prefixes included, in the same order Steam itself shows
 * them) lowercased, with apostrophes ("'") and exclamation marks ("!")
 * removed outright (not replaced with a space/dash — "Warrior's Spirit"
 * becomes "warriors-spirit", not "warrior-s-spirit"), accented letters
 * folded down to their plain ASCII base (e.g. "Quäckenbirdt" becomes
 * "quackenbirdt", not "qu%C3%A4ckenbirdt" — unlike backpack.tf, which
 * keeps the accent as-is), and every run of whitespace and/or literal
 * "-" turned into a single "-" (so a name with its own dash, e.g.
 * "Noise Maker - Winter Holiday", collapses to one "-" between words
 * instead of leaving the spaces around it as extra dashes:
 * "noise-maker-winter-holiday", not "noise-maker---winter-holiday").
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
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // fold accents to plain ASCII (ä -> a)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/!/g, "")
    .replace(/\./g, "")
    .replace(/\:/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
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

// defindex -> name, built once by inverting the bundled name -> defindex
// schema above. Where more than one name shares a defindex (the same
// "stock vs. tradable" ambiguity noted on loadDefindexSchema), whichever
// name is encountered first wins — same convention as that lookup.
let nameByDefindexPromise = null;
function loadNameByDefindex() {
  if (!nameByDefindexPromise) {
    nameByDefindexPromise = loadDefindexSchema().then((schema) => {
      const reverse = {};
      for (const [name, defindex] of Object.entries(schema)) {
        if (!(defindex in reverse)) reverse[defindex] = name;
      }
      return reverse;
    });
  }
  return nameByDefindexPromise;
}

/**
 * Looks up an item's name from its defindex — the reverse of
 * getItemDefindex() above. Meant for pages that expose a defindex
 * somewhere (e.g. a Wiki redirect link's "?id=<defindex>") but no name
 * text at all, such as a Steam trade offer's action menu for currency
 * items (Scrap/Reclaimed/Refined Metal aren't listed on Steam Market,
 * so that menu's usual name source — its "View in Community Market"
 * link — doesn't exist for them).
 *
 * @param {string|number} defindex
 * @returns {Promise<string|null>}
 */
export async function getItemNameByDefindex(defindex) {
  const reverse = await loadNameByDefindex();
  return reverse[defindex] ?? null;
}

// Crate/case name -> every series number that name has ever been used
// for (utils/data/tf2CrateSeriesNumbers.json). Most crate types
// (themed cases, coolers, etc.) got a unique name per series, so map
// to a single-entry array — but several, most notably the base "Mann
// Co. Supply Crate", reused one name across dozens of different
// series, so those map to many.
let crateSeriesPromise = null;
function loadCrateSeriesNumbers() {
  if (!crateSeriesPromise) {
    crateSeriesPromise = fetch(
      chrome.runtime.getURL("utils/data/tf2CrateSeriesNumbers.json")
    ).then((res) => res.json());
  }
  return crateSeriesPromise;
}

/**
 * Looks up a crate/case's series number from the bundled table above —
 * a fallback for pages that don't show the number themselves (e.g.
 * steamcommunity.com's newer inventory UI; see steamcommunity.com/itemLinks).
 * Sites that already show the number as literal text (backpack.tf,
 * stntrading.eu) should keep parsing it straight off the page instead
 * of calling this — it's only a fallback, not a replacement.
 *
 * Only resolves names mapped to exactly one series number. A name like
 * "Mann Co. Supply Crate" maps to dozens, and there's no way to tell
 * which specific one an item is from its name alone — those return
 * null rather than guess.
 *
 * @param {string} name - bare crate/case name (no quality/Non-Craftable prefix, no "#N"/"Series #N" suffix)
 * @returns {Promise<number|null>}
 */
export async function getKnownCrateNumber(name) {
  const table = await loadCrateSeriesNumbers();
  const numbers = table[name];
  return numbers?.length === 1 ? numbers[0] : null;
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
 * @param {string|number} [opts.crateNumber] - crate/case series number (the "#142" backpack.tf shows, "Series #34" on stntrading.eu) — several crate types share one defindex and are only distinguished by this, e.g. "Bone-Chilling Bonanza Case" -> `5952;6;c142`
 * @returns {Promise<string|null>} null if the item name isn't in the schema
 */
export async function marketplaceTfUrl({
  name, quality = "Unique", craftable = true, ksTier, australium = false, festive = false, effectId, crateNumber,
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
  if (crateNumber != null) sku.push(`c${crateNumber}`);

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