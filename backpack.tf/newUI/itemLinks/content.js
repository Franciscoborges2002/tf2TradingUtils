/*
@TF2TradingUtils
Description:
Adds mannco.store and stntrading.eu links to the item hover tooltip on
next.backpack.tf, mirroring backpack.tf/oldUI/itemLinks for the newUI.
next.backpack.tf already fills that tooltip with its own Stats/
Classifieds/Inventory/Aggs/Item DB/Item/History/Wiki links — none of
those are duplicated here.

Mann Co. Supply Crate Keys also get a link to scrap.tf/keys — scrap.tf
has no per-item page, but its keys market page is worth linking to
directly.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/itemLinks
*/

import { SITE_BRAND_COLORS } from "../../../utils/constants/colors.js";
import { TF2_QUALITY_IDS } from "../../../utils/constants/tf2Economy.js";
import { mannCoStoreUrl, stnTradingUrl } from "../../../utils/itemLinks.js";

const QUALITY_NAMES_BY_ID = Object.fromEntries(
  Object.entries(TF2_QUALITY_IDS).map(([name, id]) => [id, name])
);

const LINK_ACCENTS = {
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
  "scrap.tf": SITE_BRAND_COLORS.scrapTf,
};

const KEY_NAME_RE = /Mann Co\. Supply Crate Key/i;

const EXTRA_LINKS_CLASS = "tf2utils-newui-extra-links";

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

function processTooltip(popper) {
  if (popper.querySelector(`.${EXTRA_LINKS_CLASS}`)) return;

  const tooltip = popper.querySelector(".item-tooltip");
  if (!tooltip) return; // tippy tooltips aren't all item tooltips

  const titleEl = tooltip.querySelector(".item-tooltip__header__title");
  const linksContainers = tooltip.querySelectorAll(".item-tooltip__content__links");
  if (!titleEl || !linksContainers.length) return;

  // Same crate case-number issue as backpack.tf oldUI (see that
  // script's itemLinks for the full explanation) — strip it before
  // building either link.
  const fullDisplayName = titleEl.textContent.trim().replace(/\s*#\d+\s*$/, "");

  if (/Non-Tradable/i.test(fullDisplayName)) return;

  // Prefer the Classifieds link (itemName + numeric quality id +
  // killstreakTier) — falls back to the suggested-value Stats link
  // (item + quality name + killstreakTier) for items with no listings,
  // since it carries the same fields but names quality directly instead
  // of by id. Neither exposes craftability, so — same fallback as
  // oldUI's currency-item case — that's read off the title text.
  const classifiedsLink = tooltip.querySelector('a[href*="/classifieds?"]');
  const statsLink = tooltip.querySelector('a[href*="/stats?"]');

  let qualityName = "Unique";
  if (classifiedsLink) {
    const qualityId = Number(new URL(classifiedsLink.href).searchParams.get("quality"));
    qualityName = QUALITY_NAMES_BY_ID[qualityId] || "Unique";
  } else if (statsLink) {
    qualityName = new URL(statsLink.href).searchParams.get("quality") || "Unique";
  }
  const craftable = !/^Non-Craftable\b/i.test(fullDisplayName);

  // mannco.store wants the full descriptive name (quality/killstreak/
  // Festivized/Non-Craftable text baked in) — exactly what the tooltip
  // title already is. No Unusual effect name is reliably available from
  // this tooltip, so skip mannco.store for Unusual items rather than
  // link somewhere wrong.
  const manncoHref = qualityName === "Unusual"
    ? null
    : mannCoStoreUrl({ name: fullDisplayName, quality: qualityName });

  // stntrading.eu bakes craftability into its own name/prefix — strip
  // "Non-Craftable " back out so it isn't duplicated. It also has no
  // separate item page per Festivized variant or killstreak tier — a
  // weapon's page lists every killstreak tier together, and Festivized
  // items are just listed under the base item's page — so both are
  // stripped too, wherever they appear (neither always leads, e.g.
  // "Vintage Festivized Professional Killstreak Kritzkrieg"). The
  // killstreak alternatives are ordered longest-first so "Professional
  // Killstreak" doesn't get half-matched by the plain "Killstreak"
  // alternative.
  const stnName = fullDisplayName
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "");

  const links = [
    { label: "mannco.store", href: manncoHref },
    { label: "stntrading.eu", href: stnTradingUrl({ name: stnName, craftable }) },
  ].filter((link) => link.href);

  // scrap.tf has no per-item page — its keys market page is the one
  // static exception worth linking to directly.
  if (KEY_NAME_RE.test(fullDisplayName)) {
    links.push({ label: "scrap.tf", href: "https://scrap.tf/keys" });
  }

  if (!links.length) return;

  const row = document.createElement("div");
  row.className = `item-tooltip__content__links ${EXTRA_LINKS_CLASS}`;
  links.forEach((link) => appendLink(row, link));
  linksContainers[linksContainers.length - 1].insertAdjacentElement("afterend", row);
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
