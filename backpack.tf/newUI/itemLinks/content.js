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
import { TF2_QUALITY_IDS, TF2_CURRENCY } from "../../../utils/constants/tf2Economy.js";
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
// (Non-Craftable is still parsed off fullDisplayName elsewhere below,
// since mannco.store/skinport.com/stntrading.eu bake that literal text
// into their own URLs — but the craftable boolean itself comes from here.)
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

  // stntrading.eu keeps a crate's case/series number as part of the
  // name (see rawTitle/stnName below); mannco.store/skinport.com only
  // want it for ambiguous multi-series names (see resolveCrateSeries()).
  const rawTitle = titleEl.textContent.trim();
  const fullDisplayName = rawTitle.replace(CRATE_NUMBER_RE, "");
  const bareName = fullDisplayName.replace(/^Non-Craftable\s+/i, "");

  // Non-Tradable items (gifted/trade-locked, etc.) can't be sold on any website
  if (isTooltipNonTradable(tooltip)) return;

  let crateNumber = null;
  let isAmbiguous = false;
  // verify if its a crate, and doesnt have the word "key"
  //if it's a crate, get the case number
  const looksLikeCrate = IS_CRATE_CASE_RE.test(fullDisplayName) && !/\bkey\b/i.test(fullDisplayName);
  if (looksLikeCrate) {
    ({ crateNumber, isAmbiguous } = await resolveCrateSeries(rawTitle, bareName));
  }
  const ambiguousCrateNumber = isAmbiguous ? crateNumber : undefined;

  // The Classifieds link (itemName + numeric quality id + killstreakTier)
  // is the one reliable source for quality — the tooltip has no Stats
  // link of its own to fall back to (see backpackStatsUrl() usage
  // below). Doesn't expose craftability either, so — same fallback as
  // oldUI's currency-item case — that's read off the title text.
  const classifiedsLink = tooltip.querySelector('a[href*="/classifieds?"]');

  let qualityName = "Unique";
  if (classifiedsLink) {
    const qualityId = Number(new URL(classifiedsLink.href).searchParams.get("quality"));
    qualityName = QUALITY_NAMES_BY_ID[qualityId] || "Unique";
  }
  const craftable = !isTooltipNonCraftable(tooltip);

  // backpackStatsUrl()'s next-branch `name` wants no quality/killstreak-
  // tier/Australium baked in (those are separate fields) — Festivized
  // isn't a separate field on the stats page at all (see that function's
  // own doc), so it's just stripped out, same as stnName below.
  let statsName = bareName;
  if (qualityName !== "Unique" && qualityName !== "Unusual" && statsName.startsWith(`${qualityName} `)) {
    statsName = statsName.slice(qualityName.length + 1);
  }
  statsName = statsName.replace(/^Festivized\s+/i, "");

  let ksTier;
  if (/^Professional Killstreak\s+/i.test(statsName)) {
    ksTier = 3;
    statsName = statsName.replace(/^Professional Killstreak\s+/i, "");
  } else if (/^Specialized Killstreak\s+/i.test(statsName)) {
    ksTier = 2;
    statsName = statsName.replace(/^Specialized Killstreak\s+/i, "");
  } else if (/^Killstreak\s+/i.test(statsName)) {
    ksTier = 1;
    statsName = statsName.replace(/^Killstreak\s+/i, "");
  }

  const australium = /^Australium\s+/i.test(statsName);
  if (australium) statsName = statsName.replace(/^Australium\s+/i, "");

  // stntrading.eu bakes craftability into its own name/prefix — strip
  // "Non-Craftable " back out so it isn't duplicated. It also has no
  // separate item page per Festivized variant or killstreak tier — a
  // weapon's page lists every killstreak tier together, and Festivized
  // items are just listed under the base item's page — so both are
  // stripped too, wherever they appear (neither always leads, e.g.
  // "Vintage Festivized Professional Killstreak Kritzkrieg"). The
  // killstreak alternatives are ordered longest-first so "Professional
  // Killstreak" doesn't get half-matched by the plain "Killstreak"
  // alternative. Built from rawTitle, not fullDisplayName — unlike
  // mannco.store, stntrading.eu keeps a crate's case/series number.
  const stnName = rawTitle
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "");

  // mannco.store/skinport.com both want the full descriptive name
  // (quality/killstreak/Festivized text baked in) — exactly what the
  // tooltip title already is, minus "Non-Craftable " (bareName), which
  // goes through `craftable` instead so this doesn't depend on that
  // text being there (it never actually is here — see
  // isTooltipNonCraftable above). TODO: Unusual items need their effect
  // name prepended (mannCoStoreUrl()'s `effectName` option) for a
  // correct slug — this tooltip doesn't expose one yet, so for now
  // Unusual items just link without it.
  const links = [
    { label: "bp.tf stats", href: backpackStatsUrl(statsName, qualityName, { craftable, ksTier, australium, crateNumber, next: true }) },
    { label: "mannco.store", href: mannCoStoreUrl(bareName, qualityName, { craftable, crateNumber: ambiguousCrateNumber }) },
    { label: "stntrading.eu", href: stnTradingUrl(stnName, undefined, { craftable, isAmbiguousSeries: isAmbiguous }) },
    { label: "skinport.com", href: skinportUrl(bareName, qualityName, { craftable, crateNumber: ambiguousCrateNumber }) },
  ].filter((link) => link.href);

  // scrap.tf has no per-item page — its keys market page is the one
  // static exception worth linking to directly.
  if (TF2_CURRENCY.keys.nameRe.test(fullDisplayName)) {
    links.push({ label: "scrap.tf", href: "https://scrap.tf/keys" });
  }

  if (!links.length) return;

  injectLinkStyles();

  const row = document.createElement("div");
  row.className = `item-tooltip__content__links ${EXTRA_LINKS_CLASS}`;
  links.forEach((link) => appendLink(row, link));
  linksContainers[linksContainers.length - 1].insertAdjacentElement("afterend", row);

  // crate.tf needs a network fetch (defindex lookup) and only has pages
  // for crates/cases — appended separately afterward so it never blocks
  // the synchronous links above, and skipped if this tooltip's gone by
  // the time it resolves. crateTfUrl() wants the bare schema name (no
  // "Non-Craftable " prefix — unlike mannco.store/skinport.com, it
  // takes craftability as its own separate field instead), so that's
  // stripped back out here even though fullDisplayName keeps it.
  //
  // Gated on looksLikeCrate too, not just crateNumber/craftable —
  // crateTfUrl() itself has no "is this actually a crate" check, it
  // trusts the caller: any non-craftable item at all (e.g. "Non-Craftable
  // Duck Journal") would otherwise resolve a real defindex and get a
  // bogus ".../uncraftable" crate.tf link. crateNumber != null already
  // implies looksLikeCrate (it's only ever set inside that branch above),
  // so this only actually changes anything for the !craftable case.
  if (looksLikeCrate && (crateNumber != null || !craftable)) {
    crateTfUrl(fullDisplayName.replace(/^Non-Craftable\s+/i, ""), undefined, { crateNumber, craftable })
      .then((href) => {
        if (href && row.isConnected) appendLink(row, { label: "crate.tf", href });
      })
      .catch((err) => console.warn("[TF2Utils] crate.tf link failed:", err));
  }
}

function appendLink(row, { label, href }) {
  const a = document.createElement("a");
  a.className = "btn btn-outline-brand btn-item-tooltip";
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  a.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
  row.appendChild(a);
}
