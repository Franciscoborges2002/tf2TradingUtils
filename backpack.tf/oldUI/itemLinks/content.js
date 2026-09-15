/*
@TF2TradingUtils
Description:
Adds mannco.store and stntrading.eu links to the item hover popover on
backpack.tf's classic UI, reusing utils/itemLinks.js the same way
scrap.tf and stntrading.eu's own itemLinks scripts do. Classic
backpack.tf already fills that popover with its own Bp Stats/
Classifieds/Search/Wiki links plus Steam Market and marketplace.tf
(#popover-price-links / #popover-search-links / #popover-additional-links)
— those two are skipped here since they're already covered.

Mann Co. Supply Crate Keys also get links to scrap.tf/keys,
quicksell.store/keys and cobra.tf/keys — none of the three have a
per-item page, but their keys market pages are worth linking to
directly.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/oldUI/itemLinks
*/

import { SITE_BRAND_COLORS } from "../../../utils/constants/colors.js";
import { TF2_QUALITY_IDS, TF2_QUALITY_NAMES } from "../../../utils/constants/tf2Economy.js";
import { TF2_CURRENCY } from "../../../utils/tf2Currency.js";
import { mannCoStoreUrl, stnTradingUrl, skinportUrl, crateTfUrl, loadoutTfUrl } from "../../../utils/itemLinks.js";
import { resolveCrateSeries, resolveDefindex, CRATE_NUMBER_RE, IS_CRATE_CASE_RE } from "../../../utils/tf2ItemSchema.js";
import { getEffectsData } from "../../../utils/unusualEffects.js";

const QUALITY_NAMES_BY_ID = Object.fromEntries(
  Object.entries(TF2_QUALITY_IDS).map(([name, id]) => [id, name])
);

const LINK_ACCENTS = {
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
  "scrap.tf": SITE_BRAND_COLORS.scrapTf,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "quicksell.store": SITE_BRAND_COLORS.quicksell,
  "cobra.tf": SITE_BRAND_COLORS.cobraTf,
  "loadout.tf": SITE_BRAND_COLORS.loadoutTf,
};

// backpack.tf's own stats page for one specific crate series (e.g.
// /stats/Unique/Salvaged%20Mann%20Co.%20Supply%20Crate/Tradable/Craftable/30)
// doesn't repeat that series number as literal text in the item's own
// popover title there — unlike everywhere else (classifieds, search,
// listings), where it does — since the number's already implicit from
// viewing that specific page. For a multi-series name (e.g. "Salvaged
// Mann Co. Supply Crate" spans series 30/40/50, all sharing one bundled
// schema defindex), that leaves no way to tell which series is being
// viewed from the popover text alone — the page's own URL is the only
// place left carrying it, so this reads it from there, but only when
// the popover being processed is actually for this exact item (not
// some other item's popover elsewhere on the same stats page). Only
// ever called for items IS_CRATE_CASE_RE already flagged as a
// crate/case, so it doesn't need its own separate "is this even a
// crate" guard.
function getCrateNumberFromStatsUrl(fullDisplayName) {
  const match = location.pathname.match(/^\/stats\/[^/]+\/([^/]+)\/[^/]+\/[^/]+\/(\d+)\/?$/);
  if (!match) return null;
  const [, nameSegment, numberSegment] = match;
  return decodeURIComponent(nameSegment) === fullDisplayName ? numberSegment : null;
}

const EXTRA_LINKS_ID = "popover-extra-links";

// The popover container's own id is "popover" + digits only (e.g.
// popover981475) — narrower than a plain `[id^="popover"]` match, which
// would also catch the popover's own inner elements (#popover-price-links,
// #popover-search-links, #popover-additional-links, #popover-item-tag-button)
// since those all start with "popover" too.
const POPOVER_ID_RE = /^popover\d+$/;

function isPopoverEl(el) {
  return POPOVER_ID_RE.test(el.id);
}

function collectPopovers(root) {
  return [...root.querySelectorAll('[id^="popover"]')].filter(isPopoverEl);
}

/**
 * Watches for backpack.tf's item hover popovers and injects the extra
 * links row into each one.
 *
 * Their sequential-looking ids (popover981475, popover981476, ...) mean
 * they're generated for every item up front, not lazily on first
 * hover — the whole batch already exists in the DOM (display:none)
 * by the time this script's dynamic import resolves, which is why
 * only watching for *new* nodes never found anything to process. So
 * this scans what's already there first, then keeps observing for any
 * added later (pagination, infinite scroll, etc.).
 */
export function addItemLinks() {
  collectPopovers(document).forEach(processPopover);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (isPopoverEl(node)) processPopover(node);
        collectPopovers(node).forEach(processPopover);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function processPopover(popover) {
  // The reserved-flag check guards a real race: the ambiguity check
  // below is async, and without it, a second processPopover() call for
  // this same popover (unlikely here — see addItemLinks()'s own doc —
  // but possible) could pass the "not yet injected" check above before
  // the first call's await resolves, injecting the row twice.
  if (popover.querySelector(`#${EXTRA_LINKS_ID}`) || popover.dataset.tf2utilsProcessing) return;
  popover.dataset.tf2utilsProcessing = "1";

  try {
    await processPopoverInner(popover);
  } finally {
    delete popover.dataset.tf2utilsProcessing;
  }
}

async function processPopoverInner(popover) {
  const content = popover.querySelector(".popover-content");
  const titleEl = popover.querySelector(".popover-title");
  if (!content || !titleEl) return;

  // Confirms this is actually an item popover (as opposed to some
  // unrelated tooltip that happens to share the id shape).
  if (!content.querySelector("dl.item-popover")) return;

  const itemName = titleEl.textContent.trim();
  if (!itemName) return;

  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");

  // Non-Tradable items (gifted/trade-locked, etc.) can't be sold on any website
  if (/Non-Tradable/i.test(fullDisplayName)) return;

  const links = await buildLinks(itemName, content);
  if (!links.length) return;

  const dd = document.createElement("dd");
  dd.className = "popover-btns";
  dd.id = EXTRA_LINKS_ID;
  links.forEach((link) => dd.appendChild(makeLinkBtn(link)));
  content.appendChild(dd);
}

/**
 * Parses the popover title down to the bare schema name (no quality,
 * killstreak tier, Australium, Non-Craftable, or crate number — all
 * those become separate fields).
 *
 * The Classifieds link (when present) is the reliable source for
 * quality/craftable/killstreak tier/effect id, AND the bare schema name
 * itself — backpack.tf already parsed all of it server-side there, read
 * off its own query params instead of re-deriving them from text
 * (confirmed live: "item=Flamehawk" for a popover titled "Crystal Crown
 * Flamehawk" — already the exact bare name, no text-stripping needed,
 * and correctly excludes the Unusual effect name baked into the title;
 * "particle=365" for that same item's Crystal Crown effect). Currency
 * items (Scrap/Reclaimed/Refined Metal) can't be listed on Classifieds
 * at all though, so their popover has no such link; those fall back to
 * text-based detection, the one signal still available.
 *
 * Every field is always present on the returned object — one this
 * popover genuinely can't determine is `null` rather than omitted, so
 * callers/other scripts can tell "no value" apart from "field not
 * implemented here" at a glance.
 *
 * @param {string} itemName
 * @param {Element} content - the popover's ".popover-content" element
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier: number|null, australium: boolean, effectId: string|null, effectName: string|null, crateNumber: string|null, isAmbiguousSeries: boolean}>}
 */
async function parseItemAttributes(itemName, content) {
  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");

  const searchLink = content.querySelector('#popover-search-links a[href*="/classifieds?"]');
  let quality = "Unique";
  let craftable = !/^Non-Craftable\b/i.test(fullDisplayName);
  let ksTier = /\bProfessional Killstreak\b/i.test(fullDisplayName) ? 3
    : /\bSpecialized Killstreak\b/i.test(fullDisplayName) ? 2
    : /\bKillstreak\b/i.test(fullDisplayName) ? 1
    : null;
  let itemParam = null;
  let particleId = null;
  if (searchLink) {
    const params = new URL(searchLink.href).searchParams;
    const qualityId = Number(params.get("quality"));
    quality = QUALITY_NAMES_BY_ID[qualityId] || "Unique";
    craftable = params.get("craftable") !== "-1";
    if (params.has("killstreak_tier")) {
      const tier = Number(params.get("killstreak_tier"));
      ksTier = tier || null;
    }
    if (params.has("particle")) {
      particleId = Number(params.get("particle")) || null;
    }
    itemParam = params.get("item");
  }

  const australium = /\bAustralium\b/i.test(fullDisplayName);

  // crateNumber/isAmbiguousSeries: crateTfUrl() itself has no "is this
  // actually a crate" check — it trusts the caller — so this is only
  // ever resolved for names IS_CRATE_CASE_RE already flags, same gate
  // buildLinks() below uses before calling crateTfUrl().
  let crateNumber = null;
  let isAmbiguousSeries = false;
  const looksLikeCrate = IS_CRATE_CASE_RE.test(fullDisplayName) && !/\bkey\b/i.test(fullDisplayName);
  if (looksLikeCrate) {
    const bareName = fullDisplayName.replace(/^Non-Craftable\s+/i, "");
    ({ crateNumber, isAmbiguous: isAmbiguousSeries } = await resolveCrateSeries(itemName, bareName));
    if (crateNumber == null) {
      // Stats-page fallback — only ever fires for ambiguous multi-series
      // families whose own stats page doesn't repeat the number in the title.
      const fromUrl = getCrateNumberFromStatsUrl(fullDisplayName);
      if (fromUrl != null) { crateNumber = fromUrl; isAmbiguousSeries = true; }
    }
  }

  // Bare schema name — the Classifieds link's own "item" param when
  // available (see this function's own doc for why that's preferred).
  // Currency items have no Classifieds link at all, so those still fall
  // back to stripping Non-Craftable/Festivized/killstreak/Australium
  // text, then the quality word itself (only shown as text for
  // non-Unique/non-Unusual qualities, matching Steam's own display
  // convention).
  let name = itemParam;
  if (!name) {
    name = fullDisplayName
      .replace(/^Non-Craftable\s+/i, "")
      .replace(/Festivized\s+/i, "")
      .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "")
      .replace(/\bAustralium\s+/i, "");
    if (quality !== "Unique" && quality !== "Unusual") {
      for (const q of TF2_QUALITY_NAMES) {
        if (name.startsWith(q + " ")) { name = name.slice((q + " ").length); break; }
      }
    }
  }

  // effectId/effectName: reverse-looked-up from the Classifieds link's
  // own "particle" param against the same bundled effect data every
  // other itemLinks script uses — a name-only match isn't needed here
  // since the numeric id is already known directly.
  let effectId = null;
  let effectName = null;
  if (quality === "Unusual" && particleId != null) {
    const effectData = await getEffectsData();
    const match = effectData[particleId];
    effectId = match?.id ?? String(particleId);
    effectName = match?.name ?? null;
  }

  return { name, quality, craftable, ksTier, australium, effectId, effectName, crateNumber, isAmbiguousSeries };
}

/**
 * Builds every reference link for the item — mannco.store/stntrading.eu/
 * skinport.com/crate.tf (crates/cases only)/loadout.tf (Unusuals only) —
 * as one array, all resolved together before anything renders.
 */
async function buildLinks(itemName, content) {
  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");
  const attrs = await parseItemAttributes(itemName, content);
  const isUnusual = attrs.quality === "Unusual";
  const ambiguousCrateNumber = attrs.isAmbiguousSeries ? attrs.crateNumber : undefined;

  // mannco.store/skinport.com both want the full descriptive name
  // (quality/killstreak/Festivized text baked in) — exactly what the
  // popover title already is, minus "Non-Craftable " (craftableAwareName),
  // which goes through `craftable` instead so this doesn't depend on
  // that text being there.
  const craftableAwareName = fullDisplayName.replace(/^Non-Craftable\s+/i, "");

  // crate.tf needs a network fetch (defindex lookup) and only has pages
  // for crates/cases — resolved as its own step (not inline in the array
  // below) since it needs this extra gate check, not just
  // crateNumber/craftable like the others.
  const looksLikeCrate = IS_CRATE_CASE_RE.test(fullDisplayName) && !/\bkey\b/i.test(fullDisplayName);
  const crateTfHref = (looksLikeCrate && (attrs.crateNumber != null || !attrs.craftable))
    ? await crateTfUrl(attrs.name, undefined, { crateNumber: attrs.crateNumber, craftable: attrs.craftable })
        .catch((err) => { console.warn("[TF2Utils] crate.tf link failed:", err); return null; })
    : null;

  // loadout.tf only ever applies to Unusuals with a resolved effect —
  // resolved as its own step since it needs a defindex lookup, not
  // just attrs like most of the array below.
  let loadoutTfHref = null;
  if (isUnusual && attrs.effectId) {
    const defindex = await resolveDefindex(attrs.name).catch((err) => {
      console.warn("[TF2Utils] loadout.tf defindex lookup failed:", err);
      return null;
    });
    if (defindex != null) loadoutTfHref = loadoutTfUrl(defindex, attrs.effectId);
  }

  // stntrading.eu keeps a crate's case/series number as part of the
  // name (unlike mannco.store/skinport.com, which only want it for
  // ambiguous multi-series names — see resolveCrateSeries()) and has no
  // separate item page per Festivized variant or killstreak tier, so
  // both stay stripped from its own name too.
  const stnName = itemName
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "");

  const links = [
    {
      label: "mannco.store",
      // Steam's own item name never includes the effect (it's a
      // separate field, see parseItemAttributes()'s own doc) but
      // mannco.store's slug wants it prepended — same convention
      // stntrading.eu/itemLinks uses for this same exception. Only
      // switched in once an effect name's actually known, so this
      // never goes from "a link" to "no link" — an Unusual with no
      // resolved effect name still falls back to the same link this
      // always built before.
      href: isUnusual && attrs.effectName
        ? mannCoStoreUrl(`Unusual ${attrs.name}`, undefined, { effectName: attrs.effectName })
        : mannCoStoreUrl(craftableAwareName, attrs.quality, { craftable: attrs.craftable, crateNumber: ambiguousCrateNumber }),
    },
    { label: "stntrading.eu", href: stnTradingUrl(stnName, undefined, { craftable: attrs.craftable, isAmbiguousSeries: attrs.isAmbiguousSeries }) },
    { label: "skinport.com", href: skinportUrl(craftableAwareName, attrs.quality, { craftable: attrs.craftable, crateNumber: ambiguousCrateNumber }) },
    { label: "crate.tf", href: crateTfHref },
    { label: "loadout.tf", href: loadoutTfHref },
  ].filter((link) => link.href);

  // scrap.tf/quicksell.store/cobra.tf all have no per-item page — each
  // one's own keys market page is the one static exception worth
  // linking to directly.
  if (TF2_CURRENCY.keys.nameRe.test(fullDisplayName)) {
    links.push({ label: "scrap.tf", href: "https://scrap.tf/keys" });
    links.push({ label: "quicksell.store", href: "https://quicksell.store/keys" });
    links.push({ label: "cobra.tf", href: "https://cobra.tf/keys" });
  }

  return links;
}

function makeLinkBtn({ label, href }) {
  const a = document.createElement("a");
  a.className = "btn btn-default btn-xs";
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  a.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
  return a;
}
