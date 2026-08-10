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
import { ITEM_NAME_QUIRKS } from "./constants/itemNameQuirks.js";

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
 * Crate/case names known to span multiple series under one shared
 * display name (base "Mann Co. Supply Crate"/"Mann Co. Supply
 * Munition", ...) need the word "Series" in front of the number on
 * stntrading.eu regardless of whether the source site's own text
 * included it — confirmed: "Mann Co. Supply Munition #91" (no "Series"
 * word on backpack.tf) still needs
 * ".../Mann+Co.+Supply+Munition+Series+%2391" here, not
 * ".../Mann+Co.+Supply+Munition+%2391". Pass `isAmbiguousSeries: true`
 * (from isAmbiguousCrateName()) and a trailing "#N" with no "Series"
 * word gets one inserted; everything else (most crates, which are
 * already unambiguous by name alone) is left exactly as given.
 *
 * @param {object} opts
 * @param {string} opts.name - full item name (quality prefix included, as stntrading.eu shows it — keep any "Series #N"/"#N" crate suffix too, unlike mannco.store/marketplace.tf's separate crate handling)
 * @param {boolean} [opts.craftable=true]
 * @param {boolean} [opts.isAmbiguousSeries=false] - see doc above
 */
export function stnTradingUrl({ name, craftable = true, isAmbiguousSeries = false }) {
  let workingName = name;
  if (isAmbiguousSeries && !/Series\s+#\d+\s*$/i.test(workingName)) {
    workingName = workingName.replace(/#(\d+)\s*$/i, "Series #$1");
  }

  const encoded = workingName
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
 * Crate/case series number: dropped for almost every crate, since a
 * unique display name (most themed cases) is already enough on its own
 * (confirmed: "Bone-Chilling Bonanza Case" -> ".../440-bone-chilling-
 * bonanza-case", no number at all) — but a handful of names span many
 * different series (base "Mann Co. Supply Crate"/"Mann Co. Supply
 * Munition", "Salvaged Mann Co. Supply Crate", ...), and for those,
 * mannco.store has the exact same name-collision problem our own
 * defindex schema does, so it needs the number too: pass it via
 * `crateNumber` and it's appended as "-series-<N>" — confirmed:
 * "Salvaged Mann Co. Supply Crate" #30 -> ".../440-salvaged-mann-co-
 * supply-crate-series-30".
 *
 * @param {object} opts
 * @param {string} opts.name - full item name, as Steam displays it (no effect name, no "Series #N"/"#N" suffix) — include "Non-Craftable " if applicable
 * @param {string} [opts.quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {string} [opts.effectName] - Unusual effect name, e.g. "Frostbite"
 * @param {number} [opts.appId] - defaults to TF2
 * @param {string|number} [opts.crateNumber] - only for crate/case names known to span multiple series under one display name — see doc above
 */
export function mannCoStoreUrl({ name, quality, effectName, appId = TF2_APPID, crateNumber }) {
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
  const seriesSuffix = crateNumber != null ? `-series-${crateNumber}` : "";
  return `https://mannco.store/item/${appId}-${slug}${seriesSuffix}`;
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
 * Resolves a defindex, crate/case-series-aware: some crate/case names
 * span multiple series under one display name, each with its own real
 * defindex (e.g. "Mann Co. Supply Munition" #91 is defindex 5802, but
 * #90 is 5781) — the bundled schema can only store one defindex per
 * plain name key, which would be wrong for every series except
 * whichever one happened to get scraped into it. Confirmed per-series
 * entries are added to the same schema file keyed as "<name> #<N>"
 * (e.g. "Mann Co. Supply Munition #91": 5802) and checked here first.
 *
 * For a name known to span multiple series at all (per the bundled
 * tf2CrateSeriesNumbers.json — see loadCrateSeriesNumbers below), a
 * series with no confirmed "<name> #<N>" entry yet returns null rather
 * than falling back to the plain name's defindex, which would just be
 * some OTHER series' value guessed wrong. The plain-name fallback is
 * only trusted for names that aren't ambiguous in the first place
 * (single/no known series — the vast majority of items).
 */
async function resolveDefindex(name, crateNumber) {
  const schema = await loadDefindexSchema();
  if (crateNumber != null) {
    const seriesDefindex = schema[`${name} #${crateNumber}`];
    if (seriesDefindex != null) return seriesDefindex;

    const seriesNumbers = await loadCrateSeriesNumbers();
    if ((seriesNumbers[name]?.length ?? 0) > 1) return null;
  }
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
 * Whether a crate/case name is known to span multiple series under one
 * shared display name (per the same bundled table above) — mannco.store
 * and skinport.com need the series number kept in their slug for these
 * specifically (the same name-collision problem our own defindex schema
 * has), but drop it for every other crate, whose name alone is already
 * unambiguous.
 *
 * NOT reliably signaled by whether the page's own text says "Series #N"
 * vs. plain "#N" — confirmed wrong: "Mann Co. Supply Munition" spans 8
 * different series same as "Mann Co. Supply Crate" does, but backpack.tf
 * doesn't actually show a "Series" word for either of them in practice.
 * This checks the real, confirmed multi-series data instead.
 *
 * @param {string} name - bare crate/case name (no quality/Non-Craftable prefix, no "#N"/"Series #N" suffix)
 * @returns {Promise<boolean>}
 */
export async function isAmbiguousCrateName(name) {
  const table = await loadCrateSeriesNumbers();
  return (table[name]?.length ?? 0) > 1;
}

/** Crate/case "#N"/"Series #N" suffix shape, shared by every itemLinks script. */
export const CRATE_NUMBER_RE = /\s+(?:Series\s+)?#(\d+)\s*$/i;

/**
 * Resolves the crate number + ambiguity flag mannco.store/skinport.com/
 * stntrading.eu need, for callers that would otherwise each match
 * CRATE_NUMBER_RE and await isAmbiguousCrateName() themselves.
 *
 * @param {string} rawText - full name as shown, suffix included
 * @param {string} bareName - bare schema name, matching tf2ItemDefindexes.json's keys
 * @returns {Promise<{crateNumber: string|null, isAmbiguous: boolean}>}
 */
export async function resolveCrateSeries(rawText, bareName) {
  const match = String(rawText || "").match(CRATE_NUMBER_RE);
  if (!match) return { crateNumber: null, isAmbiguous: false };

  return { crateNumber: match[1], isAmbiguous: await isAmbiguousCrateName(bareName) };
}

/**
 * skinport.com item page.
 *
 * The slug is a generic slugify of the full display name (quality/
 * killstreak/Non-Craftable prefixes included, same order Steam shows
 * them) — lowercased, with every run of one-or-more non-alphanumeric
 * characters (spaces, punctuation, "#", accented letters — unlike
 * mannco.store, skinport.com does NOT fold accents to a plain ASCII
 * base, e.g. "Quäckenbirdt" -> "qu-ckenbirdt", not "quackenbirdt";
 * confirmed against real skinport.com URLs) collapsed to a single "-",
 * and any leading/trailing "-" trimmed. Apostrophes aren't dropped
 * either, unlike mannco.store — they become their own "-" like any
 * other punctuation: "Collector's Jag" -> "collector-s-jag" (not
 * "collectors-jag"), "Professional Killstreak C.A.P.P.E.R" ->
 * "professional-killstreak-c-a-p-p-e-r" (each "." becomes its own "-",
 * not stripped), "Strange Part: Damage Dealt" ->
 * "strange-part-damage-dealt" (the ": " run collapses to one "-").
 *
 * Non-Craftable is its own special case, unlike every other prefix:
 * rather than folding into the dash-slug like the rest of the name
 * would, it's stripped out and appended as a literal "+uncraftable"
 * suffix instead — confirmed against a real skinport.com URL:
 * "Non-Craftable Unlocked Cosmetic Crate Multi-Class" ->
 * "unlocked-cosmetic-crate-multi-class+uncraftable", not
 * "non-craftable-unlocked-cosmetic-crate-multi-class".
 *
 * A handful of items also need a leading "The " that isn't part of
 * their normal display name anywhere else — ITEM_NAME_QUIRKS'
 * `skinportNeedsThePrefix` (tracked independently from mannco.store's
 * own, similarly-named quirk: confirmed NOT to always match it — see
 * Quäckenbirdt below). Only applied when no quality word ends up
 * leading the name, i.e. quality is Unique/Unusual/omitted: confirmed
 * against two real skinport.com URLs for the same item — the
 * unqualified version is "the-qu-ckenbirdt", but the Genuine version is
 * "genuine-qu-ckenbirdt", with no "the" at all.
 *
 * Crate/case series number: dropped for almost every crate (a unique
 * display name is already enough on its own), but a handful of names
 * span many different series under one shared display name (base
 * "Mann Co. Supply Crate"/"Mann Co. Supply Munition", "Salvaged Mann
 * Co. Supply Crate", ...) — those need it too, appended as "-series-<N>"
 * before the "+uncraftable" suffix if both apply: confirmed "Salvaged
 * Mann Co. Supply Crate" #30 -> ".../salvaged-mann-co-supply-crate-series-30".
 *
 * @param {object} opts
 * @param {string} opts.name - full item name (quality/killstreak/Non-Craftable prefixes included, as Steam displays them; no "Series #N"/"#N" suffix)
 * @param {string} [opts.quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {string|number} [opts.crateNumber] - only for crate/case names known to span multiple series under one display name — see doc above
 */
export function skinportUrl({ name, quality, crateNumber }) {
  // Non-Craftable is stripped before the quirk lookup below (not just
  // before slugifying) — ITEM_NAME_QUIRKS is keyed by the bare name, so
  // leaving "Non-Craftable " attached would make a Non-Craftable
  // Quäckenbirdt silently miss its "The " (confirmed: the correct link
  // is "the-qu-ckenbirdt+uncraftable", not "qu-ckenbirdt+uncraftable").
  const trimmed = name.trim();
  const isNonCraftable = /^non-craftable\s+/i.test(trimmed);
  const withoutCraftability = trimmed.replace(/^non-craftable\s+/i, "");

  let fullName = ensureQualityPrefix(withoutCraftability, quality);

  if (!quality || quality === "Unique" || quality === "Unusual") {
    const quirk = ITEM_NAME_QUIRKS[fullName];
    if (quirk?.skinportNeedsThePrefix && !fullName.startsWith("The ")) {
      fullName = `The ${fullName}`;
    }
  }

  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const seriesSuffix = crateNumber != null ? `-series-${crateNumber}` : "";
  return `https://skinport.com/tf2/item/${slug}${seriesSuffix}${isNonCraftable ? "+uncraftable" : ""}`;
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
  const defindex = await resolveDefindex(name, crateNumber);
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

/**
 * crate.tf item page — crates/cases only. Keyed by the same
 * defindex/quality/crate-number sku marketplace.tf uses, but "-"
 * separated instead of ";" — confirmed against three real crate.tf
 * URLs: "End of the Line Community Crate #87" ->
 * https://crate.tf/item/5774-6-c87, "Crimson Cache Case #133" ->
 * https://crate.tf/item/5928-6-c133.
 *
 * One-off reward/unlock crates with no series/case number at all (e.g.
 * "Unlocked Cosmetic Crate Multi-Class" — same one flagged by
 * ITEM_NAME_QUIRKS' steamMarketOmitsNonCraftablePrefix for a related
 * reason: it has no craftable variant to disambiguate from either) use
 * "uncraftable" as the third sku segment instead of "c<N>" — confirmed:
 * "Non-Craftable Unlocked Cosmetic Crate Multi-Class" ->
 * https://crate.tf/item/5860-6-uncraftable, no crate number anywhere.
 *
 * @param {object} opts
 * @param {string} opts.name - bare crate/case name, no "#N"/"Series #N" suffix (matches the TF2 schema's own item_name)
 * @param {string|number} [opts.crateNumber] - crate/case series number (the "#142" backpack.tf shows, "Series #34" on stntrading.eu) — omit only for a one-off reward crate with no series number at all
 * @param {boolean} [opts.craftable=true] - only consulted when crateNumber is omitted, to build the "uncraftable" sku variant above
 * @returns {Promise<string|null>} null if the item name isn't in the schema, or if there's neither a crate number nor a Non-Craftable variant to key off
 */
export async function crateTfUrl({ name, crateNumber, craftable = true }) {
  const defindex = await resolveDefindex(name, crateNumber);
  if (defindex == null) return null;

  if (crateNumber != null) {
    return `https://crate.tf/item/${defindex}-${TF2_QUALITY_IDS.Unique}-c${crateNumber}`;
  }
  if (!craftable) {
    return `https://crate.tf/item/${defindex}-${TF2_QUALITY_IDS.Unique}-uncraftable`;
  }
  return null;
}

/**
 * backpack.tf Classifieds "sell" listing draft for one specific item —
 * unlike every other link here, this isn't derivable from the item's
 * name/quality/etc. at all, just its Steam asset id.
 * @param {string|number} assetId
 */
export function backpackSellUrl(assetId) {
  return `https://backpack.tf/classifieds/sell/${assetId}`;
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