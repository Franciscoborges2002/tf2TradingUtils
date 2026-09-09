/*
@TF2TradingUtils
Description:
Adds a bp.tf stats link (next.backpack.tf's own tooltip has no Stats
link at all, unlike Classifieds), plus mannco.store and stntrading.eu
links, to the item hover tooltip on next.backpack.tf, mirroring
backpack.tf/oldUI/itemLinks for the newUI. next.backpack.tf already
fills that tooltip with its own Classifieds/Inventory/Aggs/Item DB/
Item/History/Wiki links — none of those are duplicated here.

Mann Co. Supply Crate Keys also get a link to scrap.tf/keys — scrap.tf
has no per-item page, but its keys market page is worth linking to
directly.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/itemLinks
*/

import { SITE_BRAND_COLORS } from "../../../utils/constants/colors.js";
import { TF2_QUALITY_IDS, TF2_QUALITY_NAMES } from "../../../utils/constants/tf2Economy.js";
import { TF2_CURRENCY } from "../../../utils/tf2Currency.js";
import { backpackStatsUrl, mannCoStoreUrl, stnTradingUrl, skinportUrl, crateTfUrl } from "../../../utils/itemLinks.js";
import { resolveCrateSeries, CRATE_NUMBER_RE, IS_CRATE_CASE_RE } from "../../../utils/tf2ItemSchema.js";

const QUALITY_NAMES_BY_ID = Object.fromEntries(
  Object.entries(TF2_QUALITY_IDS).map(([name, id]) => [id, name])
);

const LINK_ACCENTS = {
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
  "scrap.tf": SITE_BRAND_COLORS.scrapTf,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
};

const EXTRA_LINKS_CLASS = "tf2utils-newui-extra-links";
const STYLES_ID = "tf2utils-newui-extra-links-styles";

// Margin so our row doesn't crowd the native links row above it/whatever
// follows below it; smaller buttons than the site's own btn-item-tooltip
// default so a 4-6 link row doesn't dominate the tooltip.
function injectLinkStyles() {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .${EXTRA_LINKS_CLASS} {
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .${EXTRA_LINKS_CLASS} .btn-item-tooltip {
      font-size: 0.75rem;
      padding: 2px 8px;
    }
  `;
  document.head.appendChild(style);
}

// Tippy.js (the tooltip library next.backpack.tf uses) hands out
// "tippy-N" ids sitewide — to every tooltip on the site, not just item
// ones — so unlike backpack.tf oldUI's "popoverN" ids, the id alone
// doesn't identify an item tooltip. Confirmed instead by requiring a
// nested .item-tooltip element (see processTooltip).
const TIPPY_ID_RE = /^tippy-\d+$/;

function isTippyPopper(el) {
  return TIPPY_ID_RE.test(el.id);
}

function collectTooltips(root) {
  return [...root.querySelectorAll('[id^="tippy-"]')].filter(isTippyPopper);
}

// next.backpack.tf's tooltip has its own attributes row (Tradable/
// Craftable/Origin/...) — the real signal for both trade-hold and
// craftability, read directly instead of guessing from title text.
function getTooltipAttributeValue(tooltip, attributeTitle) {
  const attributes = tooltip.querySelectorAll(
    ".item-tooltip__content__attributes__container .attribute"
  );
  for (const attribute of attributes) {
    const title = attribute.querySelector(".attribute__title")?.textContent.trim();
    if (title === attributeTitle) {
      return attribute.querySelector(".attribute__value")?.textContent.trim() ?? null;
    }
  }
  return null;
}

function isTooltipNonTradable(tooltip) {
  return getTooltipAttributeValue(tooltip, "Tradable") === "No";
}

function isTooltipNonCraftable(tooltip) {
  return getTooltipAttributeValue(tooltip, "Craftable") === "No";
}

/**
 * Watches for next.backpack.tf's item hover tooltips and injects the
 * extra links row into each one. Scans whatever's already in the DOM on
 * load (same reasoning as backpack.tf oldUI/itemLinks — no guarantee
 * every tooltip gets created only after this script attaches), then
 * keeps watching for any added later.
 */
export function addItemLinksNewUI() {
  collectTooltips(document).forEach(processTooltip);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (isTippyPopper(node)) processTooltip(node);
        collectTooltips(node).forEach(processTooltip);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function processTooltip(popper) {
  // The reserved-flag check guards a real race: the ambiguity check
  // below is async, and without it, a second processTooltip() call for
  // this same popper before the first one's await resolves could pass
  // the "not yet injected" check above and inject the row twice.
  if (popper.querySelector(`.${EXTRA_LINKS_CLASS}`) || popper.dataset.tf2utilsProcessing) return;
  popper.dataset.tf2utilsProcessing = "1";

  try {
    await processTooltipInner(popper);
  } finally {
    delete popper.dataset.tf2utilsProcessing;
  }
}

async function processTooltipInner(popper) {
  const tooltip = popper.querySelector(".item-tooltip");
  if (!tooltip) return; // tippy tooltips aren't all item tooltips

  const titleEl = tooltip.querySelector(".item-tooltip__header__title");
  const linksContainers = tooltip.querySelectorAll(".item-tooltip__content__links");
  if (!titleEl || !linksContainers.length) return;

  const itemName = titleEl.textContent.trim();
  if (!itemName) return;

  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");

  // Non-Tradable items (gifted/trade-locked, etc.) can't be sold on any website
  if (isTooltipNonTradable(tooltip)) return;

  const links = await buildLinks(itemName, tooltip);
  if (!links.length) return;

  injectLinkStyles();

  const row = document.createElement("div");
  row.className = `item-tooltip__content__links ${EXTRA_LINKS_CLASS}`;
  links.forEach((link) => row.appendChild(makeLinkBtn(link)));
  linksContainers[linksContainers.length - 1].insertAdjacentElement("afterend", row);
}

/**
 * Parses the tooltip title down to the bare schema name (no quality,
 * killstreak tier, Australium, Non-Craftable, or crate number — all
 * those become separate fields).
 *
 * `craftable` comes from the tooltip's own attributes row (the reliable
 * signal — see isTooltipNonCraftable() above), not text. The
 * Classifieds link (when present) is the reliable source for quality
 * and killstreak tier — read off its own query params instead of
 * re-deriving them from text; currency items (Scrap/Reclaimed/Refined
 * Metal) can't be listed on Classifieds at all though, so their
 * tooltip has no such link — those fall back to text-based detection.
 *
 * Every field is always present on the returned object — one this
 * tooltip genuinely can't determine (there's no Unusual effect name
 * exposed here at all) is `null` rather than omitted, so callers/other
 * scripts can tell "no value" apart from "field not implemented here"
 * at a glance.
 *
 * @param {string} itemName
 * @param {Element} tooltip - the ".item-tooltip" element
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier: number|null, australium: boolean, effectId: null, effectName: null, crateNumber: string|null, isAmbiguousSeries: boolean}>}
 */
async function parseItemAttributes(itemName, tooltip) {
  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");
  const craftable = !isTooltipNonCraftable(tooltip);

  const classifiedsLink = tooltip.querySelector('a[href*="/classifieds?"]');
  let quality = "Unique";
  let ksTier = /\bProfessional Killstreak\b/i.test(fullDisplayName) ? 3
    : /\bSpecialized Killstreak\b/i.test(fullDisplayName) ? 2
    : /\bKillstreak\b/i.test(fullDisplayName) ? 1
    : null;
  if (classifiedsLink) {
    const params = new URL(classifiedsLink.href).searchParams;
    const qualityId = Number(params.get("quality"));
    quality = QUALITY_NAMES_BY_ID[qualityId] || "Unique";
    if (params.has("killstreakTier")) {
      const tier = Number(params.get("killstreakTier"));
      ksTier = tier || null;
    }
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
  }

  // Reduce down to the bare schema name — strip Non-Craftable/
  // Festivized/killstreak/Australium text, then the quality word itself
  // (only shown as text for non-Unique/non-Unusual qualities, matching
  // Steam's own display convention). Unusual items keep the effect name
  // baked in here — this tooltip doesn't expose one to strip separately.
  let name = fullDisplayName
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "")
    .replace(/\bAustralium\s+/i, "");
  if (quality !== "Unique" && quality !== "Unusual") {
    for (const q of TF2_QUALITY_NAMES) {
      if (name.startsWith(q + " ")) { name = name.slice((q + " ").length); break; }
    }
  }

  return { name, quality, craftable, ksTier, australium, effectId: null, effectName: null, crateNumber, isAmbiguousSeries };
}

/**
 * Builds every reference link for the item — bp.tf stats, mannco.store/
 * stntrading.eu/skinport.com/crate.tf (crates/cases only) — as one
 * array, all resolved together before anything renders.
 */
async function buildLinks(itemName, tooltip) {
  const fullDisplayName = itemName.replace(CRATE_NUMBER_RE, "");
  const attrs = await parseItemAttributes(itemName, tooltip);
  const ambiguousCrateNumber = attrs.isAmbiguousSeries ? attrs.crateNumber : undefined;

  // mannco.store/skinport.com both want the full descriptive name
  // (quality/killstreak/Festivized text baked in) — exactly what the
  // tooltip title already is, minus "Non-Craftable " (craftableAwareName),
  // which goes through `craftable` instead so this doesn't depend on
  // that text being there (it never actually is here — see
  // isTooltipNonCraftable above). TODO: Unusual items need their effect
  // name prepended (mannCoStoreUrl()'s `effectName` option) for a
  // correct slug — this tooltip doesn't expose one yet, so for now
  // Unusual items just link without it.
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
    { label: "bp.tf stats", href: backpackStatsUrl(attrs.name, attrs.quality, { craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, crateNumber: attrs.crateNumber, next: true }) },
    { label: "mannco.store", href: mannCoStoreUrl(craftableAwareName, attrs.quality, { craftable: attrs.craftable, crateNumber: ambiguousCrateNumber }) },
    { label: "stntrading.eu", href: stnTradingUrl(stnName, undefined, { craftable: attrs.craftable, isAmbiguousSeries: attrs.isAmbiguousSeries }) },
    { label: "skinport.com", href: skinportUrl(craftableAwareName, attrs.quality, { craftable: attrs.craftable, crateNumber: ambiguousCrateNumber }) },
    { label: "crate.tf", href: crateTfHref },
  ].filter((link) => link.href);

  // scrap.tf has no per-item page — its keys market page is the one
  // static exception worth linking to directly.
  if (TF2_CURRENCY.keys.nameRe.test(fullDisplayName)) {
    links.push({ label: "scrap.tf", href: "https://scrap.tf/keys" });
  }

  return links;
}

function makeLinkBtn({ label, href }) {
  const a = document.createElement("a");
  a.className = "btn btn-outline-brand btn-item-tooltip";
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  a.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
  return a;
}
