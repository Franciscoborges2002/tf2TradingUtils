/**
 * TF2 item schema data + lookups: name <-> defindex, and crate/case
 * series numbers — split out of utils/itemLinks.js, which now only
 * builds URLs from an already-resolved defindex/crate-number, not the
 * data those come from.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

/**
 * Matches a crate/case's trailing series/case number — sometimes with
 * a "Series " word first (base supply crates, e.g. "Mann Co. Supply
 * Crate Series #34" — "Series" isn't part of the schema name either,
 * unlike themed cosmetic cases, e.g. "Bone-Chilling Bonanza Case #142",
 * whose "Case" IS part of the name and stays). Shared by every site
 * here that needs to strip the number off before the usual name parse
 * and re-attach it wherever that destination site wants it.
 */
export const CRATE_NUMBER_RE = /\s+(?:Series\s+)?#(\d+)\s*$/i;

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
export async function resolveDefindex(name, crateNumber) {
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
