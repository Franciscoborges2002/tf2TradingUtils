import {
  backpackStatsUrl,
  mannCoStoreUrl,
  marketplaceTfUrl,
  merchantTfUrl,
  gladiatorTfUrl,
  pricedbUrl,
  liquidTfUrl,
  steamMarketUrl,
  skinportUrl,
  crateTfUrl,
  wikiUrl,
} from "../../utils/itemLinks.js";
import {
  getKnownCrateNumber,
  resolveCrateSeries,
  CRATE_NUMBER_RE,
  IS_CRATE_CASE_RE,
} from "../../utils/tf2ItemSchema.js";
import { ksPrefixFor } from "../../utils/tf2ItemName.js";
import { getEffectsData } from "../../utils/unusualEffects.js";
import { SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import { ITEM_NAME_QUIRKS } from "../../utils/constants/itemNameQuirks.js";
import { TF2_QUALITY_NAMES, TF2_CRAFTABILITY } from "../../utils/constants/tf2Economy.js";
import { getSettings } from "../../utils/settings.js";

// A distinct accent color per destination site, so the row reads as a
// set of different places rather than one undifferentiated button mass.
const LINK_ACCENTS = {
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "merchant.tf": SITE_BRAND_COLORS.merchantTf,
  "gladiator.tf": SITE_BRAND_COLORS.gladiatorTf,
  "pricedb.io": SITE_BRAND_COLORS.pricedb,
  "liquid.tf": SITE_BRAND_COLORS.liquidTf,
  "Steam Market": SITE_BRAND_COLORS.steam,
  "Wiki": SITE_BRAND_COLORS.wiki,
};

/**
 * Adds quick links (backpack.tf, mannco.store, marketplace.tf, Steam
 * Market, Wiki) for the item shown on an stntrading.eu item page.
 * Renamed from link2Backpack — same page, now covers more sites. Every
 * destination link is built directly from utils/itemLinks.js's own
 * builders right here — this file only ever does its own name parsing
 * (parseShallow()/parseItemAttributes()/findUnusualEffect()), never a
 * local wrapper standing in for one of those builders.
 */
export async function showItemLinks() {
  // For a mistyped/unknown item (e.g. a stale link), stntrading.eu
  // renders a ".error-box" page instead — there's no <h1> at all here,
  // so grabbing it directly below would throw.
  const settings = await getSettings();

  if (document.querySelector(".error-box")) return;

  const itemName = document.querySelector("h1").innerHTML; //Get the name of the item
  const placeAddLink = document.getElementsByClassName("card-body")[1]; //place for were i want to add the links in the actual page
  if (!placeAddLink) return;

  const isUnusual = itemName.includes("Unusual");
  // Fetched once and reused — Bp Stats and mannco.store both need the
  // same Unusual effect for this item.
  const effect = isUnusual ? await findUnusualEffect(itemName) : null;
  const isNonCraftable = itemName.includes(TF2_CRAFTABILITY[1]);

  // "Shallow" parse (keeps killstreak/Australium/"Festive " baked into
  // name) for merchant.tf/gladiator.tf/Wiki — crate/case series number
  // stripped first, same convention parseShallow()'s own doc describes,
  // so the Wiki link doesn't 404 on a per-series number its real
  // article never had (confirmed: the article for "Mann Co. Supply
  // Crate" covers every series under one shared page).
  const crateMatch = itemName.match(CRATE_NUMBER_RE);
  const nameWithoutSeries = crateMatch ? itemName.slice(0, crateMatch.index) : itemName;
  const shallow = parseShallow(nameWithoutSeries);
  const crateNumberFromText = crateMatch ? crateMatch[1] : undefined;

  // Deeper parse (quality/killstreak/Australium/Non-Craftable all
  // pulled out as separate fields) for bp.tf stats/marketplace.tf/
  // pricedb.io/liquid.tf/crate.tf — bp.tf stats needs ksTier/australium
  // as their own fields (not baked into text like shallow above) so the
  // next.backpack.tf branch can pass ksTier as its own query param
  // instead of silently dropping it.
  const itemAttrs = await parseItemAttributes(itemName);
  // Gates crate.tf below — crateTfUrl() itself has no "is this actually
  // a crate" check, it trusts the caller.
  const looksLikeCrate = itemAttrs != null && IS_CRATE_CASE_RE.test(itemAttrs.name) && !/\bkey\b/i.test(itemAttrs.name);

  // bp.tf stats specifically also needs ITEM_NAME_QUIRKS' backpack.tf
  // casing fix (e.g. Force-A-Nature) — keyed by the bare weapon name,
  // "Festive " stripped just for that lookup then reattached (see
  // ITEM_NAME_QUIRKS' own doc for why a Festive weapon still needs it).
  const bpFestivePrefix = itemAttrs?.name.startsWith("Festive ") ? "Festive " : "";
  const bpBaseForQuirk = itemAttrs ? (bpFestivePrefix ? itemAttrs.name.slice(bpFestivePrefix.length) : itemAttrs.name) : "";
  const bpQuirkName = bpFestivePrefix + (ITEM_NAME_QUIRKS[bpBaseForQuirk]?.backpackName ?? bpBaseForQuirk);

  // mannco.store/skinport.com only want the crate number for ambiguous
  // multi-series names (see resolveCrateSeries()) — dropped for every
  // other crate. Cheap sync check first — resolveCrateSeries() does the
  // same CRATE_NUMBER_RE test internally before its own (async)
  // ambiguity lookup, but doing it here too means most items (no crate
  // number at all) never enter that async function in the first place.
  const manncoSkinportName = itemName.replace(CRATE_NUMBER_RE, "");
  const { crateNumber: seriesNumber, isAmbiguous } = CRATE_NUMBER_RE.test(itemName)
    ? await resolveCrateSeries(itemName, manncoSkinportName)
    : { crateNumber: null, isAmbiguous: false };
  const ambiguousCrateNumber = isAmbiguous ? seriesNumber : undefined;

  const links = [
    {
      label: "bp.tf stats",
      href: isUnusual
        // Unusual — mannco.store's own effect-name-prepend convention
        // has no equivalent field on bp.tf, it's just the effectId.
        ? (effect
            ? backpackStatsUrl(stripUnusualEffectName(itemName, effect.name), "Unusual", {
                craftable: !isNonCraftable, effectId: effect.id, next: settings.bpTfVersion === "next",
              })
            : null) // no effect match — can't build a useful link
        // Classic bp.tf has no separate killstreak-tier/Australium field
        // at all — ksPrefixFor() + the "Australium " prefix have to be
        // baked into the name directly (see backpackStatsUrl()'s own
        // doc); next.backpack.tf is the opposite, it wants the bare name
        // with ksTier/australium as their own query params instead.
        : (itemAttrs
            ? (settings.bpTfVersion === "next"
                ? backpackStatsUrl(itemAttrs.name, itemAttrs.quality, {
                    craftable: itemAttrs.craftable, ksTier: itemAttrs.ksTier, australium: itemAttrs.australium, next: true,
                  })
                : backpackStatsUrl(ksPrefixFor(itemAttrs.ksTier) + (itemAttrs.australium ? "Australium " : "") + bpQuirkName, itemAttrs.quality, {
                    craftable: itemAttrs.craftable, effectId: itemAttrs.crateNumber,
                  }))
            : null),
    },
    {
      label: "mannco.store",
      href: isUnusual
        // Unusual — mannco.store wants the effect name prepended, which
        // Steam's own item name never includes.
        ? (effect ? mannCoStoreUrl(`Unusual ${stripUnusualEffectName(itemName, effect.name)}`, undefined, { effectName: effect.name }) : "")
        // "Non-Craftable " (if present) is kept as-is — mannCoStoreUrl()
        // turns it into mannco.store's "uncraftable" slug word.
        : mannCoStoreUrl(manncoSkinportName, undefined, { crateNumber: ambiguousCrateNumber }),
    },
    // No Unusual effect name is known to belong anywhere in
    // skinport.com's slug (unconfirmed, unlike mannco.store's
    // prepend-effect-name convention), so Unusuals are skipped rather
    // than guessed wrong.
    {
      label: "skinport.com",
      href: isUnusual ? null : skinportUrl(manncoSkinportName, undefined, { crateNumber: ambiguousCrateNumber }),
    },
    { label: "marketplace.tf", href: itemAttrs ? await marketplaceTfUrl(itemAttrs.name, itemAttrs.quality, itemAttrs) : null },
    // crate.tf only has pages for crates/cases. crateTfUrl() itself has
    // no "is this actually a crate" check — it trusts the caller: any
    // non-craftable item at all (e.g. "Non-Craftable Duck Journal")
    // would otherwise resolve a real defindex and get a bogus
    // ".../uncraftable" crate.tf link, since itemAttrs.crateNumber would
    // be undefined but itemAttrs.craftable is false either way — same
    // fix already applied to every other itemLinks script.
    {
      label: "crate.tf",
      href: (looksLikeCrate && (itemAttrs.crateNumber != null || !itemAttrs.craftable))
        ? await crateTfUrl(itemAttrs.name, itemAttrs.quality, itemAttrs)
        : null,
    },
    // Unlike marketplace.tf/crate.tf, merchant.tf/gladiator.tf need no
    // schema/defindex lookup, so both stay sync — and unlike
    // mannco.store/skinport.com, they want a crate's series number every
    // time it has one, not just for ambiguous names.
    { label: "merchant.tf", href: merchantTfUrl(shallow.name, shallow.quality, { craftable: shallow.craftable, crateNumber: crateNumberFromText }) },
    { label: "gladiator.tf", href: gladiatorTfUrl(shallow.name, shallow.quality, { craftable: shallow.craftable, crateNumber: crateNumberFromText }) },
    { label: "pricedb.io", href: itemAttrs ? await pricedbUrl(itemAttrs.name, itemAttrs.quality, itemAttrs) : null },
    // Same defindex lookup as marketplace.tf/pricedb.io, plus the extra
    // fields (effectName, isAmbiguousSeries) itemAttrs already carries
    // for exactly this — see liquidTfUrl()'s own doc for what they're for.
    { label: "liquid.tf", href: itemAttrs ? await liquidTfUrl(itemAttrs.name, itemAttrs.quality, itemAttrs) : null },
    { label: "Steam Market", href: steamMarketUrl(itemName.trim()) },
    { label: "Wiki", href: wikiUrl(shallow.name) },
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
 * Used for classic + next backpack.tf stats, merchant.tf, gladiator.tf
 * and Wiki.
 */
function parseShallow(itemNameRaw) {
  let name = String(itemNameRaw || "").trim();

  const isNonCraftable = name.includes(TF2_CRAFTABILITY[1]);
  if (name.startsWith("The ")) name = name.slice(4);

  let matchedQuality = "Unique";
  for (const q of TF2_QUALITY_NAMES) {
    if (name.startsWith(q + " ")) {
      matchedQuality = q;
      name = name.slice((q + " ").length);
      break;
    }
  }

  if (isNonCraftable) {
    name = name.replace(TF2_CRAFTABILITY[1] + " ", "").trim();
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
 * Parses an item's full name down to the bare schema name (no quality,
 * no "The ", no killstreak/Australium/Non-Craftable text — all those
 * become separate fields) plus the attributes the query-param based
 * links (marketplace.tf/pricedb.io/liquid.tf/crate.tf) need. "Festive "
 * is deliberately left in the name rather than pulled out as its own
 * field — see parseShallow() above for why (it's a distinct
 * item/defindex, not a modifier like killstreak tier or Australium):
 * marketplace.tf's schema lookup needs "Festive Eyelander" as the
 * literal name to resolve to its own defindex (1082), not "Eyelander"
 * (132).
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier?: number, australium?: boolean, effectId?: string, effectName?: string, crateNumber?: string, isAmbiguousSeries?: boolean}|null>}
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
  const isNonCraftable = name.includes(TF2_CRAFTABILITY[1]);
  if (isNonCraftable) {
    name = name.replace(TF2_CRAFTABILITY[1] + " ", "").trim();
  }

  // remove "The " at start — the schema's own item_name never has it
  if (name.startsWith("The ")) name = name.slice(4);

  // detect + strip quality, default Unique
  let matchedQuality = "Unique";
  for (const q of TF2_QUALITY_NAMES) {
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
    return { name: baseName, quality: "Unusual", craftable: !isNonCraftable, effectId: effect.id, effectName: effect.name };
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

  // Whether the crate number came from literal text on the page itself
  // (crateMatch) vs. the bundled fallback table below — only the former
  // means the item's own display name genuinely includes it, which is
  // what liquidTfUrl's `isAmbiguousSeries` decides whether to echo in
  // its slug (see that function's own doc for why).
  const isAmbiguousSeries = crateMatch != null;
  if (crateNumber === undefined) {
    crateNumber = (await getKnownCrateNumber(name)) ?? undefined;
  }

  return { name, quality: matchedQuality, craftable: !isNonCraftable, ksTier, australium, crateNumber, isAmbiguousSeries };
}
