/**
 * Shared builders for external TF2 item-info URLs (Steam Market,
 * backpack.tf, stntrading.eu, the TF2 Wiki), so every site's content
 * script produces the same URL shapes instead of each hand-rolling
 * its own string concatenation.
 *
 * Each site keeps its own item name/quality/craftability parsing —
 * that part depends on whatever markup that particular site renders —
 * and just calls these with the normalized result. Defindex/crate-series
 * *data* (the bundled schema, and the lookups over it) lives in
 * ./tf2ItemSchema.js instead — this file only builds URLs from an
 * already-resolved defindex/crate number, it doesn't resolve them itself.
 *
 * Every builder below takes the same three arguments — `(name, quality,
 * options)` — instead of each inventing its own shape (the state
 * before this: `quality` vs `qualityId`, `festive` vs "baked into
 * name", `sheen` vs `ksSheen`, steamMarketUrl()/wikiUrl() positional
 * while everyone else took one big object). `options` uses the same
 * field names everywhere something is shared (`craftable`, `effectId`,
 * `ksTier`, `festivized`, `ksSheen`, `ksKillstreaker`, `australium`,
 * `crateNumber`), but no builder requires every field — each only
 * reads the subset its own URL shape actually has room for (documented
 * on the function itself), and silently ignores the rest. A
 * destination with no separate field for something at all (e.g.
 * stntrading.eu has no killstreak/Australium field — that whole
 * descriptive name is one string) genuinely can't take that field via
 * `options`; its own doc says so. backpackSellUrl() and
 * postsTfSearchPayload() are the two exceptions — neither builds from
 * a single item's name/quality at all.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

import { TF2_APPID, TF2_QUALITY_IDS } from "./constants/tf2Economy.js";
import { ITEM_NAME_QUIRKS } from "./constants/itemNameQuirks.js";
import { resolveDefindex, CRATE_NUMBER_RE } from "./tf2ItemSchema.js";

/**
 * Steam Market and mannco.store both key off the item's full descriptive
 * name — quality word included (e.g. "Strange Australium Flame Thrower",
 * "Genuine Short Circuit") — unlike backpack.tf's stats page, which takes
 * quality as its own separate field. Some sites' DOM doesn't always show
 * the quality word as literal text in the name (Genuine in particular),
 * so this prepends it if it's missing rather than assuming it's there.
 * Internal helper — every builder that takes a `quality` applies this
 * itself, callers don't need to call it.
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

/**
 * TF2 Wiki page for an item.
 * @param {string} name - item name (quality prefix present or not)
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures the name starts with this quality word — same reasoning as steamMarketUrl()
 */
export function wikiUrl(name, quality) {
  const fullName = ensureQualityPrefix(name, quality);
  return `https://wiki.teamfortress.com/wiki/${encodeURIComponent(fullName)}`;
}

/**
 * backpack.tf (or next.backpack.tf) stats page for an item.
 *
 * The two sites use genuinely different URL shapes for this page —
 * classic backpack.tf is path-segment based; next.backpack.tf is
 * query-param based. Confirmed against a real next.backpack.tf URL:
 * "Bone-Chilling Bonanza Case" #142 ->
 * https://next.backpack.tf/stats?item=Bone-Chilling+Bonanza+Case&quality=Unique&priceindex=142
 * — `quality` is sent as its name, not the numeric id classic/classifieds
 * use, crate/case series number DOES have an equivalent here after all
 * (`priceindex`, sharing that one param with Unusual effect id the same
 * way classic shares one trailing path segment for both), and every
 * filter param is only included when it's not the "no filter" default —
 * no `tradable` at all, `craftable` only when non-craftable (a literal
 * boolean "false", not classic's -1/1), `killstreakTier` only when set.
 * Neither variant has a separate
 * Festivized field or page at all — confirmed live: a Festivized item's
 * stats link should land on the plain item's page, so `festivized` isn't
 * read here even though `options` carries it for other builders; bake
 * killstreak tier into `name` for classic instead (see that param's own
 * doc) if it applies.
 *
 * @param {string} name - base item name, no quality/Non-Craftable prefix. For classic backpack.tf (no `next`), bake any killstreak-tier prefix ("Killstreak ", "Specialized Killstreak ", "Professional Killstreak ") into this directly — the classic URL has no separate field for it.
 * @param {string} [quality="Unique"]
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {string|number} [options.effectId] - Unusual effect id, appended as a trailing path segment on classic, `priceindex` on next. Shares that same slot with `crateNumber` below — pass whichever one actually applies to this item, never both.
 * @param {string|number} [options.crateNumber] - crate/case series number — same slot `effectId` uses (an item is never both Unusual and a crate): trailing path segment on classic, `priceindex` on next
 * @param {number} [options.ksTier] - killstreak tier. Classic backpack.tf expects it baked into `name` instead; on next, only appended to the query when truthy
 * @param {boolean} [options.australium] - only ever sent when true (matches the confirmed-working link, which omits it otherwise)
 * @param {boolean} [options.next=false] - use next.backpack.tf instead of backpack.tf
 */
export function backpackStatsUrl(name, quality = "Unique", options = {}) {
  const { craftable = true, effectId, crateNumber, ksTier, australium, next = false } = options;

  if (next) {
    let url = `https://next.backpack.tf/stats?item=${encodeURIComponent(name)}&quality=${encodeURIComponent(quality)}`;
    if (!craftable) url += `&craftable=false`;
    if (ksTier) url += `&killstreakTier=${ksTier}`;
    if (australium) url += `&australium=1`;
    const priceindex = effectId ?? crateNumber;
    if (priceindex != null) url += `&priceindex=${priceindex}`;
    return url;
  }

  const craftSegment = craftable ? "Craftable" : "Non-Craftable";
  let url = `https://backpack.tf/stats/${encodeURIComponent(quality)}/${encodeURIComponent(name)}/Tradable/${craftSegment}`;
  const trailingSegment = effectId ?? crateNumber;
  if (trailingSegment != null) url += `/${trailingSegment}`;
  return url;
}

/**
 * backpack.tf (or next.backpack.tf) classifieds search for an item.
 * Unlike the stats page, this is query-param based — quality is sent
 * as its numeric id, resolved from `quality` internally (same as every
 * other numeric-quality destination here), not something the caller
 * looks up itself.
 *
 * Sheen/killstreaker are both numeric ids and use the exact same param
 * name ("sheen"/"killstreaker") on both classic and next.backpack.tf —
 * no `next`-branching needed for these two, unlike killstreak tier's
 * param name. Confirmed against two real URLs: classic
 * ".../classifieds?item=Ambassador&quality=11&tradable=1&craftable=1&australium=1&killstreak_tier=3&killstreaker=2003&sheen=3"
 * (Killstreaker: Cerebral Discharge, Sheen: Manndarin) and next
 * ".../classifieds?itemName=Ambassador&quality=11&australium=1&killstreakTier=3&sheen=1&killstreaker=2005"
 * (Sheen: Team Shine, Killstreaker: Flames) — same ids either way (2005
 * = Flames in both), confirming one shared numbering, not two.
 *
 * `ksSheen`/`ksKillstreaker` are passed through independently of
 * `ksTier` — real Specialized (tier 2) items only ever have a sheen,
 * real Professional (tier 3) ones always have both, but that's a fact
 * about the item, not something this function should enforce: a
 * caller that only managed to parse one of the two off its page
 * should still get a URL for what it has, not be forced to supply
 * both or neither.
 *
 * No confirmed Festivized filter param exists for this page yet
 * (nothing in either real URL above sets one) — `festivized` in
 * `options` is intentionally not read here until one is confirmed live.
 *
 * @param {string} name - item name (classic backpack.tf strips the Australium prefix itself, so pass it without "Australium ")
 * @param {string} [quality="Unique"]
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {boolean} [options.australium] - omitted from the query entirely when not given
 * @param {number} [options.ksTier=0]
 * @param {number} [options.ksSheen] - killstreak sheen id (Specialized/Professional Killstreak only) — omitted entirely when not given
 * @param {number} [options.ksKillstreaker] - killstreaker effect id (Professional Killstreak only) — omitted entirely when not given
 * @param {boolean} [options.next=false] - use next.backpack.tf instead of backpack.tf
 */
export function backpackClassifiedsUrl(name, quality = "Unique", options = {}) {
  const { craftable = true, australium, ksTier = 0, ksSheen, ksKillstreaker, next = false } = options;
  const qualityId = TF2_QUALITY_IDS[quality] ?? TF2_QUALITY_IDS.Unique;

  const base = next ? "https://next.backpack.tf/classifieds" : "https://backpack.tf/classifieds";
  const itemParam = next ? "itemName" : "item";
  const ksParam = next ? "killstreakTier" : "killstreak_tier";
  const craftParam = craftable ? 1 : -1;

  let url = `${base}?${itemParam}=${encodeURIComponent(name)}&quality=${qualityId}&tradable=1&craftable=${craftParam}`;
  if (australium != null) url += `&australium=${australium ? 1 : -1}`;
  url += `&${ksParam}=${ksTier}`;
  if (ksSheen != null) url += `&sheen=${ksSheen}`;
  if (ksKillstreaker != null) url += `&killstreaker=${ksKillstreaker}`;
  return url;
}

/**
 * stntrading.eu item page.
 *
 * Unlike every other builder here, stntrading.eu's URL has no separate
 * field for quality/killstreak/Australium/Festivized at all — the
 * whole descriptive name (quality word, killstreak tier text,
 * Festivized, Australium, all baked in by the caller) is one string,
 * so only `name` and `craftable` do anything here; `quality` still
 * gets applied via ensureQualityPrefix() (same as every other builder)
 * in case the caller hasn't already baked it in, but there's no
 * `options` field for the rest.
 *
 * Spaces are encoded as "+" (not %20), colons as %3A, apostrophes as
 * %27 and "#" as %23 — that's the URL shape stntrading.eu actually
 * expects, reverse-engineered from the site itself rather than
 * documented anywhere.
 *
 * Crate/case series number: dropped for almost every crate, same
 * convention as mannco.store/skinport.com — a unique display name
 * (most themed cases) is already enough on its own, and keeping a
 * trailing "#N" that stntrading.eu doesn't expect breaks the link
 * (confirmed: a Unique-name case like "Bone-Chilling Bonanza Case #58"
 * needs ".../Bone-Chilling+Bonanza+Case", not
 * ".../Bone-Chilling+Bonanza+Case+%2358"). Only crate/case names known
 * to span multiple series under one shared display name (base "Mann
 * Co. Supply Crate"/"Mann Co. Supply Munition", ...) need the number
 * kept, and always with the word "Series" in front regardless of
 * whether the source site's own text included it — confirmed: "Mann
 * Co. Supply Munition #91" (no "Series" word on backpack.tf) still
 * needs ".../Mann+Co.+Supply+Munition+Series+%2391" here, not
 * ".../Mann+Co.+Supply+Munition+%2391". Pass `isAmbiguousSeries: true`
 * (from isAmbiguousCrateName()) for those; everything else has any
 * trailing "#N"/"Series #N" stripped out entirely.
 *
 * @param {string} name - full item name (quality prefix included, as stntrading.eu shows it), "Series #N"/"#N" crate suffix included or not — stripped/re-added here as needed, see doc above
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — only needed if `name` doesn't already include it
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {boolean} [options.isAmbiguousSeries=false] - see doc above
 */
export function stnTradingUrl(name, quality, options = {}) {
  const { craftable = true, isAmbiguousSeries = false } = options;

  const crateMatch = name.match(CRATE_NUMBER_RE);
  const bareName = crateMatch ? name.slice(0, crateMatch.index) : name;

  let workingName = ensureQualityPrefix(bareName, quality);
  if (isAmbiguousSeries && crateMatch) {
    workingName += ` Series #${crateMatch[1]}`;
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
 * @param {string} name - full item name, as Steam displays it (no effect name, no "Series #N"/"#N" suffix) — include "Non-Craftable " if applicable, or pass `options.craftable: false` instead (whichever the caller already has on hand)
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {object} [options]
 * @param {boolean} [options.craftable=true] - prepends "Non-Craftable " when false, unless `name` already starts with it
 * @param {string} [options.effectName] - Unusual effect name, e.g. "Frostbite"
 * @param {number} [options.appId] - defaults to TF2
 * @param {string|number} [options.crateNumber] - only for crate/case names known to span multiple series under one display name — see doc above
 */
export function mannCoStoreUrl(name, quality, options = {}) {
  const { craftable = true, effectName, appId = TF2_APPID, crateNumber } = options;

  const qualifiedName = ensureQualityPrefix(name, quality);
  const fullName = effectName ? `${effectName} ${qualifiedName}` : qualifiedName;
  // Two ways in: baked into `name` itself (older convention, still
  // supported below) or `options.craftable: false` (for callers whose
  // source page exposes craftability as its own flag instead of name
  // text) — the not-already-prefixed check avoids double-prepending if
  // a caller ever passes both.
  const craftPrefixedName = !craftable && !/^non-craftable\b/i.test(fullName)
    ? `Non-Craftable ${fullName}`
    : fullName;
  const slug = craftPrefixedName
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
 * @param {string} name - full item name (quality/killstreak prefixes included, as Steam displays them; no "Series #N"/"#N" suffix) — include "Non-Craftable " if applicable, or pass `options.craftable: false` instead (whichever the caller already has on hand)
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {object} [options]
 * @param {boolean} [options.craftable=true] - appends "+uncraftable" when false, same as a "Non-Craftable " prefix already baked into `name`
 * @param {string|number} [options.crateNumber] - only for crate/case names known to span multiple series under one display name — see doc above
 */
export function skinportUrl(name, quality, options = {}) {
  const { craftable = true, crateNumber } = options;

  // Non-Craftable is stripped before the quirk lookup below (not just
  // before slugifying) — ITEM_NAME_QUIRKS is keyed by the bare name, so
  // leaving "Non-Craftable " attached would make a Non-Craftable
  // Quäckenbirdt silently miss its "The " (confirmed: the correct link
  // is "the-qu-ckenbirdt+uncraftable", not "qu-ckenbirdt+uncraftable").
  // Two ways in: baked into `name` itself (older convention, still
  // supported) or `options.craftable: false` (for callers whose source
  // page exposes craftability as its own flag instead of name text) —
  // either sets the "+uncraftable" suffix below.
  const trimmed = name.trim();
  const isNonCraftable = /^non-craftable\s+/i.test(trimmed) || !craftable;
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
 * merchant.tf trade-page URL. Unlike every other site here, the
 * "/trade/<slug>" segment isn't a lookup key at all — merchant.tf just
 * drops that text straight into its own search bar, so this doesn't
 * need to resolve to one exact listing the way a real slug/sku does:
 * confirmed the plain hat name alone surfaces every quality/variant of
 * it (including Unusuals) as search results, and a more specific query
 * (quality and/or effect name baked in) narrows those results instead
 * of failing to match.
 *
 * Craftability DOES matter here though (confirmed live: a Non-Craftable
 * item needs "non-craftable-" baked into the slug, e.g. "Festivizer" ->
 * ".../non-craftable-festivizer" — a bare ".../festivizer" search
 * doesn't surface it) — unlike quality, there's no separate field for
 * it, so "Non-Craftable " is prepended to the display name (before the
 * quality word, matching Steam's own display order) whenever
 * `craftable` is false.
 *
 * The slug is still worth shaping like a normal one rather than passing
 * raw text, since it becomes the visible URL: a generic slugify of the
 * full display name (quality prefix included) — lowercased, with
 * apostrophes ("'") and periods (".") and colons (":") and exclamation
 * marks ("!") removed outright (not replaced with a dash, same
 * convention as mannco.store — confirmed: quality "Collector's" doesn't
 * leave a stray dash behind) and every run of whitespace collapsed to a
 * single "-": "Mann Co. Supply Crate Key" -> "mann-co-supply-crate-key",
 * "Taunt: The Schadenfreude" -> "taunt-the-schadenfreude",
 * "Genuine Short Circuit" -> "genuine-short-circuit",
 * "Vintage Lugermorph" -> "vintage-lugermorph". For Unusuals, whatever
 * text is passed in `name` (effect name included, if the caller has it)
 * just becomes part of that search query same as any other quality — no
 * special-casing needed.
 *
 * Crate/case series number: unlike mannco.store/skinport.com (number
 * only for names that span multiple series), merchant.tf always wants
 * it appended as "-series-<N>" once a crate/case has one at all —
 * confirmed: "End of the Line Community Crate" #87 ->
 * ".../end-of-the-line-community-crate-series-87", "Mann Co. Supply
 * Munition" #103 -> ".../mann-co-supply-munition-series-103" (neither
 * name is ambiguous by itself, unlike the mannco.store/skinport.com
 * cases that need it).
 *
 * @param {string} name - item name (quality/Non-Craftable prefix not needed — see `quality`/`craftable` — no "Series #N"/"#N" suffix). For Unusuals, include the effect name here too if available; it only narrows the search.
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {object} [options]
 * @param {boolean} [options.craftable=true] - prepends "Non-Craftable " to the slug when false — see doc above
 * @param {string|number} [options.crateNumber] - crate/case series number, appended whenever given (see doc above — unlike mannco.store/skinport.com, always pass it, not just for ambiguous names)
 * @returns {string}
 */
export function merchantTfUrl(name, quality, options = {}) {
  const { craftable = true, crateNumber } = options;

  const qualifiedName = ensureQualityPrefix(name, quality);
  const fullName = craftable ? qualifiedName : `Non-Craftable ${qualifiedName}`;
  const slug = fullName
    .toLowerCase()
    .replace(/['.!:]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const seriesSuffix = crateNumber != null ? `-series-${crateNumber}` : "";
  return `https://merchant.tf/trade/${slug}${seriesSuffix}`;
}

/**
 * gladiator.tf sales page — a plain `?item=<full display name>` text
 * search (name kept literal, not slugified — just percent-encoded),
 * confirmed against real gladiator.tf URLs covering every prefix
 * combination: Non-Craftable ("Non-Craftable Duck Journal"), Taunts/
 * Strange Parts (passed through as part of `name` as-is: "Taunt: The
 * Final Score", "Strange Part: Kills During Victory Time"), crates/
 * cases (a plain "#N" — no "Series" word — always appended once a
 * crate/case has a number at all, confirmed for both an unambiguous
 * name, "Winter 2017 Cosmetic Case #117", and an ambiguous one shared
 * across many series, "Mann Co. Supply Crate #34"), Vintage/Genuine/
 * Collector's/Strange quality words ("Vintage Equalizer", "Genuine
 * Audio File", "Collector's Huntsman"), Killstreak tiers + Australium
 * ("Strange Specialized Killstreak Australium Grenade Launcher"),
 * Festivized ("Strange Festivized Australium Black Box" — Festivized
 * comes before Australium, same order as backpackStatsUrl's classic
 * `name`; the relative order against a killstreak tier if both were
 * ever present at once isn't confirmed by any real example), Festive
 * as a name-baked variant rather than a quality field (not
 * "Festivized" — "Festive Scattergun" is its own catalog item, passed
 * straight through as part of `name`, same convention as
 * stnTradingUrl()), apostrophes/periods kept as literal text with no
 * extra escaping beyond what encodeURIComponent itself does ("Vintage
 * Warrior's Spirit", "Mann Co. Supply Crate #34"), and names that
 * already carry their own "The "/"." text as part of the item's real
 * name ("The C.A.P.P.E.R").
 *
 * @param {string} name - the item's own descriptive name, quality/Non-Craftable/crate-number excluded but everything else (Taunt:/Strange Part: prefix, Festivized, killstreak tier text, Australium, Festive) baked in exactly as Steam would show it — same composition backpackStatsUrl()'s classic (non-`next`) `name` param and merchantTfUrl()'s `name` want
 * @param {string} [quality] - if given (and not "Unique"/"Unusual"), ensures name starts with this quality word — same reasoning as steamMarketUrl()
 * @param {object} [options]
 * @param {boolean} [options.craftable=true] - prepends "Non-Craftable " when false
 * @param {string|number} [options.crateNumber] - crate/case series number, appended as " #<N>" whenever given (confirmed: unlike mannco.store/skinport.com, always appended, not just for ambiguous names)
 * @returns {string}
 */
export function gladiatorTfUrl(name, quality, options = {}) {
  const { craftable = true, crateNumber } = options;

  const qualifiedName = ensureQualityPrefix(name, quality);
  const fullName = craftable ? qualifiedName : `Non-Craftable ${qualifiedName}`;
  const withSeries = crateNumber != null ? `${fullName} #${crateNumber}` : fullName;
  return `https://gladiator.tf/sales?item=${encodeURIComponent(withSeries)}`;
}

/**
 * Builds the TF2 "sku" array — [defindex, qualityId, ...modifiers] —
 * shared by marketplace.tf and pricedb.io below, which key off the
 * exact same shape and modifier order (uncraftable, australium,
 * kt-<tier>, festivized, u<effectId>, c<crateNumber>) and only differ
 * in how they join/format it into a URL.
 */
function buildTf2Sku(defindex, quality, { craftable = true, ksTier, australium = false, festivized = false, effectId, crateNumber } = {}) {
  const qualityId = TF2_QUALITY_IDS[quality] ?? TF2_QUALITY_IDS.Unique;
  const sku = [defindex, qualityId];

  if (!craftable) sku.push("uncraftable");
  if (australium) sku.push("australium");
  if (ksTier) sku.push(`kt-${ksTier}`);
  if (festivized) sku.push("festive");
  if (effectId != null) sku.push(`u${effectId}`);
  if (crateNumber != null) sku.push(`c${crateNumber}`);

  return sku;
}

/**
 * marketplace.tf item page — the one site here that's keyed by "sku"
 * (defindex;quality[;modifiers]) rather than a name-based slug, so this
 * needs a name -> defindex schema lookup and is async.
 *
 * @param {string} name - base item name, no quality/killstreak/Non-Craftable prefix (matches the TF2 schema's own item_name)
 * @param {string} [quality="Unique"]
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {number} [options.ksTier] - killstreak tier (1 basic, 2 specialized, 3 professional)
 * @param {boolean} [options.australium=false]
 * @param {boolean} [options.festivized=false] - the sku's "festive" modifier — despite the name, this is the killstreak-fabricator Festivized effect, not a "Festive X" catalog item (those get their own defindex via `name` instead, no separate modifier needed)
 * @param {string|number} [options.effectId] - Unusual effect id
 * @param {string|number} [options.crateNumber] - crate/case series number (the "#142" backpack.tf shows, "Series #34" on stntrading.eu) — several crate types share one defindex and are only distinguished by this, e.g. "Bone-Chilling Bonanza Case" -> `5952;6;c142`
 * @returns {Promise<string|null>} null if the item name isn't in the schema
 */
export async function marketplaceTfUrl(name, quality = "Unique", options = {}) {
  const { craftable = true, ksTier, australium = false, festivized = false, effectId, crateNumber } = options;

  const defindex = await resolveDefindex(name, crateNumber);
  if (defindex == null) return null;

  const sku = buildTf2Sku(defindex, quality, { craftable, ksTier, australium, festivized, effectId, crateNumber });
  return `https://marketplace.tf/items/tf2/${sku.join(";")}`;
}

/**
 * pricedb.io item page — keyed by the exact same sku shape
 * marketplace.tf uses above (defindex;quality[;modifiers], same
 * modifier order), just with the ";" separators percent-encoded in the
 * URL itself — confirmed against real pricedb.io URLs: "Strange
 * Australium Ambassador" -> https://pricedb.io/item/61%3B11%3Baustralium,
 * "Vintage Earbuds" -> https://pricedb.io/item/143%3B3, "Non-Craftable
 * Earbuds" -> https://pricedb.io/item/143%3B6%3Buncraftable, "Unusual
 * Burning Flames Burning Bandana" (effect id 13) ->
 * https://pricedb.io/item/30091%3B5%3Bu13, "Terrifying Trove Case" #145
 * -> https://pricedb.io/item/5960%3B6%3Bc145, "Non-Craftable Unlocked
 * Winter 2016 Cosmetic Case" #105 ->
 * https://pricedb.io/item/5865%3B6%3Buncraftable%3Bc105.
 *
 * @param {string} name - base item name, no quality/killstreak/Non-Craftable prefix (matches the TF2 schema's own item_name)
 * @param {string} [quality="Unique"]
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {number} [options.ksTier] - killstreak tier (1 basic, 2 specialized, 3 professional)
 * @param {boolean} [options.australium=false]
 * @param {boolean} [options.festivized=false] - see marketplaceTfUrl()'s own doc for why this is named `festivized`, not `festive`
 * @param {string|number} [options.effectId] - Unusual effect id
 * @param {string|number} [options.crateNumber] - crate/case series number — several crate types share one defindex and are only distinguished by this, e.g. "Bone-Chilling Bonanza Case" -> `5952;6;c142`
 * @returns {Promise<string|null>} null if the item name isn't in the schema
 */
export async function pricedbUrl(name, quality = "Unique", options = {}) {
  const { craftable = true, ksTier, australium = false, festivized = false, effectId, crateNumber } = options;

  const defindex = await resolveDefindex(name, crateNumber);
  if (defindex == null) return null;

  const sku = buildTf2Sku(defindex, quality, { craftable, ksTier, australium, festivized, effectId, crateNumber });
  return `https://pricedb.io/item/${encodeURIComponent(sku.join(";"))}`;
}

// Alphabet liquidTfUrl() below encodes defindex/quality id/effect id/
// crate number with — confirmed against real liquid.tf URLs (see that
// function's own doc): digits 0-9, then uppercase A-Z, then lowercase
// a-z, most significant digit first, no padding (e.g. 143 -> "2J", not
// "02J" or "2j").
const LIQUID_TF_BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function toLiquidTfBase62(n) {
  if (n === 0) return "0";
  let s = "";
  for (let v = n; v > 0; v = Math.floor(v / 62)) {
    s = LIQUID_TF_BASE62_ALPHABET[v % 62] + s;
  }
  return s;
}

/**
 * liquid.tf item-listing URL. Everything numeric in it (defindex,
 * quality id, Unusual effect id, crate/case series number) is base62
 * rather than decimal — confirmed against real liquid.tf URLs: Earbuds
 * (defindex 143, Unique) -> https://liquid.tf/listing/earbuds-2J-6,
 * Mann Co. Supply Crate Key (defindex 5021) ->
 * .../mann-co-supply-crate-key-1Iz-6. The quality segment being base62
 * too (not just the defindex) only shows up once a quality id reaches
 * two base62 digits — confirmed "Haunted Voodoo-Cursed Pyro Soul"
 * (Haunted = quality id 13) -> .../haunted-voodoo-cursed-pyro-soul-1Si-D
 * (quality segment "D", which only decodes as base62 13 — a decimal "13"
 * would need two characters like the defindex does). Unusual effect id
 * and crate number follow the same rule: "It's a Secret to Everybody
 * Scotsman's Stove Pipe" (effect 46, "It's A Secret To Everybody") ->
 * .../its-a-secret-to-everybody-scotsmans-stove-pipe-1w-5-uk ("uk" =
 * "u" + base62(46)), "Summer 2024 Cosmetic Case" #144 ->
 * .../summer-2024-cosmetic-case-1Y7-6-c2K ("c2K" = "c" + base62(144)).
 *
 * Killstreak tier and the uncraftable/australium flags are NOT base62 —
 * confirmed "kt-3" (plain decimal, same as marketplace.tf/pricedb.io)
 * and literal "uncraftable"/"australium" words: "Genuine Professional
 * Killstreak Sharp Dresser" ->
 * .../genuine-professional-killstreak-sharp-dresser-AI-1-kt-3, "Strange
 * Australium Medi Gun" -> .../strange-australium-medi-gun-3P-B-australium,
 * "Non-Craftable Boo Balloon" -> .../non-craftable-boo-balloon-Ex-6-uncraftable.
 *
 * The slug itself is the full descriptive name Steam would show
 * (Non-Craftable, then quality, then killstreak tier, then Australium,
 * then the item name — matching the order in the confirmed examples
 * above) — lowercased, apostrophes stripped outright (not hyphenated:
 * "Bill's Hat" -> "bills-hat"), every other run of non-alphanumeric
 * characters (periods included — confirmed "B.M.O.C." ->
 * .../b-m-o-c-Ak-6, each "." becomes its own "-", not stripped like
 * mannco.store does) collapsed to a single "-". A crate's series number
 * only appears in the slug when the item's own name is genuinely
 * ambiguous without it (`isAmbiguousSeries`, same convention as
 * stnTradingUrl() — confirmed "Summer 2024 Cosmetic Case" #144, an
 * unambiguous name, has no number anywhere in its slug even though the
 * "c2K" modifier is still there); Unusuals substitute the effect name
 * for the quality word instead of adding one (no literal "Unusual" text
 * anywhere in the confirmed example above — same convention as
 * mannco.store's `effectName` prepend). Taunts are the one further
 * exception: "Taunt: " and a leading "The " are dropped from the slug
 * only (not from `name`, which still needs the schema's real "Taunt:
 * The X" key for the defindex lookup below) — confirmed "Taunt: The
 * Schadenfreude" (defindex 463) -> .../schadenfreude-7T-6, not
 * .../taunt-the-schadenfreude-7T-6.
 *
 * No confirmed Festivized handling exists for this site (no real
 * example seen with one) — `festivized` in `options` is intentionally
 * not read here.
 *
 * @param {string} name - base item name, no quality/killstreak/Non-Craftable prefix (matches the TF2 schema's own item_name, "Taunt: " included for taunts)
 * @param {string} [quality="Unique"]
 * @param {object} [options]
 * @param {boolean} [options.craftable=true]
 * @param {number} [options.ksTier] - killstreak tier (1 basic, 2 specialized, 3 professional)
 * @param {boolean} [options.australium=false]
 * @param {string|number} [options.effectId] - Unusual effect id
 * @param {string} [options.effectName] - Unusual effect name, e.g. "Frostbite" — used in the slug only (see doc above); the link still resolves without it, just with a less specific slug
 * @param {string|number} [options.crateNumber] - crate/case series number, always passed through to the defindex lookup and the "c" modifier when known (same as marketplace.tf/pricedb.io)
 * @param {boolean} [options.isAmbiguousSeries=false] - whether to also bake "Series #<crateNumber>" into the slug text — see doc above
 * @returns {Promise<string|null>} null if the item name isn't in the schema
 */
export async function liquidTfUrl(name, quality = "Unique", options = {}) {
  const {
    craftable = true, ksTier, australium = false, effectId, effectName, crateNumber, isAmbiguousSeries = false,
  } = options;

  const defindex = await resolveDefindex(name, crateNumber);
  if (defindex == null) return null;

  const qualityId = TF2_QUALITY_IDS[quality] ?? TF2_QUALITY_IDS.Unique;

  const isTaunt = /^Taunt:\s*/i.test(name);
  let slugName = isTaunt ? name.replace(/^Taunt:\s*/i, "").replace(/^The\s+/i, "") : name;
  if (crateNumber != null && isAmbiguousSeries) slugName += ` Series #${crateNumber}`;

  const qualityText = quality === "Unusual" ? (effectName ?? "") : quality !== "Unique" ? quality : "";
  const ksText = ksTier === 3 ? "Professional Killstreak" : ksTier === 2 ? "Specialized Killstreak" : ksTier === 1 ? "Killstreak" : "";

  const fullDisplayName = [
    craftable ? "" : "Non-Craftable",
    qualityText,
    ksText,
    australium ? "Australium" : "",
    slugName,
  ].filter(Boolean).join(" ");

  const slug = fullDisplayName
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const parts = [slug, toLiquidTfBase62(defindex), toLiquidTfBase62(qualityId)];
  if (!craftable) parts.push("uncraftable");
  if (australium) parts.push("australium");
  if (ksTier) parts.push(`kt-${ksTier}`);
  if (effectId != null) parts.push(`u${toLiquidTfBase62(Number(effectId))}`);
  if (crateNumber != null) parts.push(`c${toLiquidTfBase62(Number(crateNumber))}`);

  return `https://liquid.tf/listing/${parts.join("-")}`;
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
 * `quality` is accepted for signature consistency with every other
 * builder here, but real crates are always Unique quality (the sku's
 * quality segment is hardcoded accordingly) — it's ignored.
 *
 * @param {string} name - bare crate/case name, no "#N"/"Series #N" suffix (matches the TF2 schema's own item_name)
 * @param {string} [quality] - ignored, see doc above
 * @param {object} [options]
 * @param {string|number} [options.crateNumber] - crate/case series number (the "#142" backpack.tf shows, "Series #34" on stntrading.eu) — omit only for a one-off reward crate with no series number at all
 * @param {boolean} [options.craftable=true] - only consulted when crateNumber is omitted, to build the "uncraftable" sku variant above
 * @returns {Promise<string|null>} null if the item name isn't in the schema, or if there's neither a crate number nor a Non-Craftable variant to key off
 */
export async function crateTfUrl(name, quality, options = {}) {
  const { crateNumber, craftable = true } = options;

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
 * unlike every other builder here, this isn't derivable from the
 * item's name/quality/etc. at all, just its Steam asset id, so it's
 * the one exception to the `(name, quality, options)` shape.
 * @param {string|number} assetId
 */
export function backpackSellUrl(assetId) {
  return `https://backpack.tf/classifieds/sell/${assetId}`;
}

/** posts.tf's plain search results page — no query params, since it doesn't read search state from the URL. */
export const POSTS_TF_SEARCH_RESULTS_URL = "https://posts.tf/posts/search/results";

/**
 * posts.tf search request body. Takes arrays of items rather than one
 * item's name/quality/etc., so this is the other exception to the
 * `(name, quality, options)` shape.
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
