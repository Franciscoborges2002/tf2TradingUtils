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

Mann Co. Supply Crate Keys also get a link to scrap.tf/keys — scrap.tf
has no per-item page, but its keys market page is worth linking to
directly.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/oldUI/itemLinks
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

function processPopover(popover) {
  if (popover.querySelector(`#${EXTRA_LINKS_ID}`)) return;

  const content = popover.querySelector(".popover-content");
  const titleEl = popover.querySelector(".popover-title");
  if (!content || !titleEl) return;

  // Confirms this is actually an item popover (as opposed to some
  // unrelated tooltip that happens to share the id shape).
  if (!content.querySelector("dl.item-popover")) return;

  // backpack.tf suffixes crates with their case number (e.g.
  // "Bone-Chilling Bonanza Case #142"), but mannco.store and
  // stntrading.eu don't distinguish crates by case number in their own
  // pages/slugs — strip it before building either link.
  const fullDisplayName = titleEl.textContent.trim().replace(/\s*#\d+\s*$/, "");

  // Non-Tradable items (gifted/trade-locked, etc.) can't be sold on any
  // of these sites — skip the row entirely rather than link to a
  // trading site for an item that can't actually be traded.
  if (/Non-Tradable/i.test(fullDisplayName)) return;

  // The Classifieds link is the reliable source for quality/craftable
  // (backpack.tf already parsed them server-side) — but currency items
  // (Scrap/Reclaimed/Refined Metal) can't be listed on Classifieds at
  // all, so their popover has no such link. Fall back to defaults that
  // hold for every item that lacks one: Unique quality, and craftable
  // read off the title text itself (the one signal still available).
  const searchLink = content.querySelector('#popover-search-links a[href*="/classifieds?"]');
  let qualityName = "Unique";
  let craftable = !/^Non-Craftable\b/i.test(fullDisplayName);
  if (searchLink) {
    const params = new URL(searchLink.href).searchParams;
    const qualityId = Number(params.get("quality"));
    qualityName = QUALITY_NAMES_BY_ID[qualityId] || "Unique";
    craftable = params.get("craftable") !== "-1";
  }

  // mannco.store wants the full descriptive name (quality/killstreak/
  // Festivized/Non-Craftable text baked in) — exactly what the popover
  // title already is. No Unusual effect name is reliably available from
  // this popover, so skip mannco.store for Unusual items rather than
  // link somewhere wrong.
  const manncoHref = qualityName === "Unusual"
    ? null
    : mannCoStoreUrl({ name: fullDisplayName, quality: qualityName });

  // stntrading.eu bakes craftability into its own name/prefix — strip
  // "Non-Craftable " back out of the title so it isn't duplicated. It
  // also has no separate item page for the Festivized variant of a
  // weapon — Festivized items are just listed under the base item's
  // page — so that word is stripped too. Not anchored to the start:
  // "Festivized" doesn't always lead (e.g. "Vintage Festivized
  // Kritzkrieg" — quality word first), unlike Non-Craftable, which
  // always does.
  const stnName = fullDisplayName
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "");

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

  const dd = document.createElement("dd");
  dd.className = "popover-btns";
  dd.id = EXTRA_LINKS_ID;
  links.forEach((link) => appendLink(dd, link));
  content.appendChild(dd);
}

function appendLink(dd, { label, href }) {
  const a = document.createElement("a");
  a.className = "btn btn-default btn-xs";
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  a.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
  dd.appendChild(a);
}
