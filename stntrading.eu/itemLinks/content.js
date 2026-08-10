import {
  backpackStatsUrl,
  mannCoStoreUrl,
  marketplaceTfUrl,
  steamMarketUrl,
  skinportUrl,
  crateTfUrl,
  getKnownCrateNumber,
  wikiUrl,
} from "../../utils/itemLinks.js";
import { SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import { ITEM_NAME_QUIRKS } from "../../utils/constants/itemNameQuirks.js";

// Index 4 ("Unusual") is referenced directly below (ITEMS_QUALITY[4]) —
// new entries go at the end so that index stays put.
const ITEMS_QUALITY = ["Unique", "Strange", "Vintage", "Haunted", "Unusual", "Genuine", "Collector's"];
const ITEMS_CRAFTABILITY = ["Craftable", "Non-Craftable"];
let effectsDataPromise = null; //to get the utils effects ids

// Crates carry their series/case number as a trailing "#N" — sometimes
// with a "Series " word first (base supply crates, e.g. "Mann Co.
// Supply Crate Series #34" — "Series" isn't part of the schema name
// either, unlike themed cosmetic cases, e.g. "Bone-Chilling Bonanza
// Case #142", whose "Case" IS part of the name and stays). Matches
// either shape; whichever's present is stripped along with the number
// before the usual parse, then the number's re-attached wherever each
// destination site wants it: backpack.tf's stats page takes it as a
// trailing path segment (same slot Unusual effect ids use), marketplace.tf
// as a "c<N>" sku modifier — mannco.store doesn't distinguish by it at
// all, so it's just dropped for that one.
const CRATE_NUMBER_RE = /\s+(?:Series\s+)?#(\d+)\s*$/i;

// A distinct accent color per destination site, so the row reads as a
// set of different places rather than one undifferentiated button mass.
const LINK_ACCENTS = {
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "next.bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "Steam Market": SITE_BRAND_COLORS.steam,
  "Wiki": SITE_BRAND_COLORS.wiki,
};

/**
 * Adds quick links (backpack.tf, mannco.store, marketplace.tf, Steam
 * Market, Wiki) for the item shown on an stntrading.eu item page.
 * Renamed from link2Backpack — same page, now covers more sites.
 */
export async function showItemLinks() {
  // For a mistyped/unknown item (e.g. a stale link), stntrading.eu
  // renders a ".error-box" page instead — there's no <h1> at all here,
  // so grabbing it directly below would throw.
  if (document.querySelector(".error-box")) return;

  const itemName = document.querySelector("h1").innerHTML; //Get the name of the item
  const placeAddLink = document.getElementsByClassName("card-body")[1]; //place for were i want to add the links in the actual page
  if (!placeAddLink) return;

  const isUnusual = itemName.includes(ITEMS_QUALITY[4]);
  // Fetched once and reused — Bp Stats, Next Bp Stats and mannco.store
  // all need the same Unusual effect for this item.
  const effect = isUnusual ? await findUnusualEffect(itemName) : null;

  const links = [
    { label: "bp.tf stats", href: await createBpStatsLink(itemName, isUnusual, effect, false) },
    { label: "next.bp.tf stats", href: await createBpStatsLink(itemName, isUnusual, effect, true) },
    { label: "mannco.store", href: await createManncoLink(itemName, isUnusual, effect) },
    { label: "skinport.com", href: createSkinportLink(itemName, isUnusual) },
    { label: "marketplace.tf", href: await createMarketplaceLink(itemName) },
    { label: "crate.tf", href: await createCrateTfLink(itemName) },
    { label: "Steam Market", href: steamMarketUrl(itemName.trim()) },
    { label: "Wiki", href: wikiUrl(parseShallow(itemName).name) },
  ];

  injectLinkStyles();

  const row = document.createElement("div");
  row.className = "tf2utils-links-row";
  placeAddLink.appendChild(row);

  for (const { label, href } of links) {
    if (!href) continue;
    const a = document.createElement("a");
    a.textContent = label;
    a.href = href;
    a.target = "_blank";
    a.classList.add("btn", "btn-secondary", "tf2utils-link-btn");
    a.style.setProperty("--tf2utils-accent", LINK_ACCENTS[label] || "#999");
    row.appendChild(a);
  }
}

function injectLinkStyles() {
  const STYLES_ID = "tf2utils-item-links-styles";
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .tf2utils-links-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .tf2utils-link-btn {
      border-left: 3px solid var(--tf2utils-accent, #999);
      transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    }
    .tf2utils-link-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.2);
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Strips "The " and the recognized quality word, and separates out
 * craftability — but keeps killstreak/Australium/"Festive " text baked
 * into the name (stntrading.eu item names don't carry killstreak text
 * at all; see parseItemAttributes() for the deeper parse the query-
 * param-based links need). "Festive " is deliberately NOT stripped:
 * unlike "Festivized" (the killstreak-fabricator effect, which keeps
 * the base weapon's own defindex), a Festive weapon is a genuinely
 * separate item with its own defindex — e.g. Festive Eyelander is
 * defindex 1082, plain Eyelander is 132 — so backpack.tf has its own
 * distinct stats page for it too, one this must not collapse into.
 * Used for classic + next backpack.tf stats and Wiki.
 */
function parseShallow(itemNameRaw) {
  let name = String(itemNameRaw || "").trim();

  const isNonCraftable = name.includes(ITEMS_CRAFTABILITY[1]);
  if (name.startsWith("The ")) name = name.slice(4);

  let matchedQuality = "Unique";
  for (const q of ITEMS_QUALITY) {
    if (name.startsWith(q + " ")) {
      matchedQuality = q;
      name = name.slice((q + " ").length);
      break;
    }
  }

  if (isNonCraftable) {
    name = name.replace(ITEMS_CRAFTABILITY[1] + " ", "").trim();
  }

  return { name, quality: matchedQuality, craftable: !isNonCraftable };
}

/**
 * Finds the Unusual effect whose name appears in the item's name.
 * @param {string} itemNameRaw
 * @returns {Promise<{name: string, id: string}|null>}
 */
async function findUnusualEffect(itemNameRaw) {
  const effectData = await getEffectsData(); // dynamic load here

  // effectData should be an object like:
  // { "32": { "name": "Orbiting Planets", "id": "32" }, ... }

  const entries = Object.values(effectData);
  const lowerName = itemNameRaw.toLowerCase();

  return entries.find((e) => lowerName.includes(e.name.toLowerCase())) ?? null;
}

/** Strips the leading "Unusual " and the effect name out of an Unusual item's full name. */
function stripUnusualEffectName(itemNameRaw, effectName) {
  let baseName = itemNameRaw;
  baseName = baseName.replace(/^Unusual\s+/i, ""); // Remove leading "Unusual "
  const effectNameRegex = new RegExp(effectName, "i");
  baseName = baseName.replace(effectNameRegex, "").trim(); // Remove the effect name (case-insensitive, once)
  baseName = baseName.replace(/^[-,\s]+/, "").trim(); // Clean commas/extra spaces from the start
  return baseName;
}

/**
 * Build a backpack.tf (or next.backpack.tf) stats URL for an item.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} isUnusual
 * @param {{name: string, id: string}|null} effect
 * @param {boolean} useNext - true → use next.backpack.tf, false → use backpack.tf
 * @returns {Promise<string|null>}
 */
async function createBpStatsLink(itemNameRaw, isUnusual, effect, useNext) {
  if (isUnusual) {
    if (!effect) return null; // no effect match — can't build a useful link
    const baseName = stripUnusualEffectName(itemNameRaw, effect.name);
    return backpackStatsUrl({
      name: baseName, quality: "Unusual", craftable: true, effectId: effect.id, next: useNext,
    });
  }

  const crateMatch = itemNameRaw.match(CRATE_NUMBER_RE);
  const nameWithoutSeries = crateMatch ? itemNameRaw.slice(0, crateMatch.index) : itemNameRaw;

  const { name, quality, craftable } = parseShallow(nameWithoutSeries);

  // ITEM_NAME_QUIRKS (e.g. Force-A-Nature's backpack.tf casing fix) is
  // keyed by the bare weapon name — strip "Festive " just for that
  // lookup, then reattach it, so the quirk still applies to a Festive
  // weapon too instead of only ever matching the plain one.
  const festivePrefix = name.startsWith("Festive ") ? "Festive " : "";
  const baseForQuirk = festivePrefix ? name.slice(festivePrefix.length) : name;
  const quirk = ITEM_NAME_QUIRKS[baseForQuirk];

  return backpackStatsUrl({
    name: festivePrefix + (quirk?.backpackName ?? baseForQuirk),
    quality,
    craftable,
    effectId: crateMatch ? crateMatch[1] : undefined,
    next: useNext,
  });
}

/**
 * Parses an item's full name down to the bare schema name (no quality,
 * no "The ", no killstreak/Australium/Non-Craftable text — all those
 * become separate fields) plus the attributes the query-param based
 * links (classifieds, marketplace.tf) need. "Festive " is deliberately
 * left in the name rather than pulled out as its own field — see
 * parseShallow() above for why (it's a distinct item/defindex, not a
 * modifier like killstreak tier or Australium): marketplace.tf's
 * schema lookup needs "Festive Eyelander" as the literal name to
 * resolve to its own defindex (1082), not "Eyelander" (132).
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier?: number, australium?: boolean, effectId?: string, crateNumber?: string}|null>}
 */
async function parseItemAttributes(itemNameRaw) {
  // Crate series/case number always trails at the very end, after
  // everything else — strip it first so it can't interfere with the
  // rest of the parse below. Not every crate/case page shows it as
  // literal text though (confirmed: "Winter 2021 Cosmetic Case" has no
  // "#N" anywhere in its own h1, unlike backpack.tf's title, which
  // always includes it) — the bundled series-number table is the
  // fallback for those, resolved once the bare name's known below (same
  // fallback steamcommunity.com/itemLinks uses for the same reason).
  const crateMatch = String(itemNameRaw || "").match(CRATE_NUMBER_RE);
  let crateNumber = crateMatch ? crateMatch[1] : undefined;
  let name = String(crateMatch ? itemNameRaw.slice(0, crateMatch.index) : itemNameRaw || "").trim();

  // detect + strip craftability
  const isNonCraftable = name.includes(ITEMS_CRAFTABILITY[1]);
  if (isNonCraftable) {
    name = name.replace(ITEMS_CRAFTABILITY[1] + " ", "").trim();
  }

  // remove "The " at start — the schema's own item_name never has it
  if (name.startsWith("The ")) name = name.slice(4);

  // detect + strip quality, default Unique
  let matchedQuality = "Unique";
  for (const q of ITEMS_QUALITY) {
    if (name.startsWith(q + " ")) {
      matchedQuality = q;
      name = name.slice((q + " ").length);
      break;
    }
  }

  if (matchedQuality === "Unusual") {
    const effect = await findUnusualEffect(itemNameRaw);
    if (!effect) return null;
    const baseName = stripUnusualEffectName(name, effect.name);
    return { name: baseName, quality: "Unusual", craftable: !isNonCraftable, effectId: effect.id };
  }

  // detect + strip killstreak tier — stntrading.eu item names don't
  // carry this at all (killstreak variants are shown as a separate
  // count on the item's page, not a name prefix), but keep the check
  // in case that ever changes.
  let ksTier;
  if (name.startsWith("Professional Killstreak ")) {
    ksTier = 3;
    name = name.slice("Professional Killstreak ".length);
  } else if (name.startsWith("Specialized Killstreak ")) {
    ksTier = 2;
    name = name.slice("Specialized Killstreak ".length);
  } else if (name.startsWith("Killstreak ")) {
    ksTier = 1;
    name = name.slice("Killstreak ".length);
  }

  // detect + strip Australium — a separate sku field. "Festive " is
  // NOT stripped here (see this function's own doc comment above).
  const australium = name.startsWith("Australium ");
  if (australium) name = name.slice("Australium ".length);

  if (crateNumber === undefined) {
    crateNumber = (await getKnownCrateNumber(name)) ?? undefined;
  }

  return { name, quality: matchedQuality, craftable: !isNonCraftable, ksTier, australium, crateNumber };
}

/**
 * Build a mannco.store item URL.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} isUnusual
 * @param {{name: string, id: string}|null} effect
 * @returns {Promise<string>}
 */
async function createManncoLink(itemNameRaw, isUnusual, effect) {
  const name = String(itemNameRaw || "").trim();

  if (isUnusual) {
    // Unusual — mannco.store wants the effect name prepended, which
    // Steam's own item name never includes.
    if (!effect) return "";
    const baseName = stripUnusualEffectName(name, effect.name);
    return mannCoStoreUrl({ name: `Unusual ${baseName}`, effectName: effect.name });
  }

  // mannco.store doesn't distinguish crates by series/case number the
  // way marketplace.tf and backpack.tf do — drop it if present.
  const crateMatch = name.match(CRATE_NUMBER_RE);
  const manncoName = crateMatch ? name.slice(0, crateMatch.index) : name;

  // "Non-Craftable " (if present) is kept as-is — mannCoStoreUrl()
  // turns it into mannco.store's "uncraftable" slug word.
  return mannCoStoreUrl({ name: manncoName });
}

/**
 * Build a skinport.com item URL. No Unusual effect name is known to
 * belong anywhere in skinport.com's slug (unconfirmed, unlike
 * mannco.store's prepend-effect-name convention), so Unusuals are
 * skipped rather than guessed wrong — same reasoning as createManncoLink().
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} isUnusual
 * @returns {string|null}
 */
function createSkinportLink(itemNameRaw, isUnusual) {
  if (isUnusual) return null;

  const name = String(itemNameRaw || "").trim();

  // skinport.com doesn't distinguish crates by series/case number —
  // same reasoning as mannco.store, drop it if present.
  const crateMatch = name.match(CRATE_NUMBER_RE);
  const skinportName = crateMatch ? name.slice(0, crateMatch.index) : name;

  return skinportUrl({ name: skinportName });
}

/**
 * Build a marketplace.tf item URL.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<string|null>}
 */
async function createMarketplaceLink(itemNameRaw) {
  const attrs = await parseItemAttributes(itemNameRaw);
  if (!attrs) return null;
  return marketplaceTfUrl(attrs);
}

/**
 * Build a crate.tf item URL — crates/cases only. crateTfUrl() itself
 * returns null with no crate number, so this naturally resolves to
 * null for every non-crate item too, without needing its own item-type
 * check here.
 *
 * @param {string} itemNameRaw - e.g., "Mann Co. Supply Crate Series #34"
 * @returns {Promise<string|null>}
 */
async function createCrateTfLink(itemNameRaw) {
  const attrs = await parseItemAttributes(itemNameRaw);
  if (!attrs) return null;
  return crateTfUrl(attrs);
}

// Load and cache the JSON dynamically
async function getEffectsData() {
  if (!effectsDataPromise) {
    effectsDataPromise = fetch(
      chrome.runtime.getURL("utils/backpackUnusualsIds.json")
    ).then((res) => res.json());
  }
  return effectsDataPromise;
}
