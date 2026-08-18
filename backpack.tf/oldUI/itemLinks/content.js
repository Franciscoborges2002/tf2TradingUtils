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
import { mannCoStoreUrl, stnTradingUrl, skinportUrl, crateTfUrl, resolveCrateSeries, CRATE_NUMBER_RE } from "../../../utils/itemLinks.js";

const QUALITY_NAMES_BY_ID = Object.fromEntries(
  Object.entries(TF2_QUALITY_IDS).map(([name, id]) => [id, name])
);

const LINK_ACCENTS = {
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
  "scrap.tf": SITE_BRAND_COLORS.scrapTf,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
};

const KEY_NAME_RE = /Mann Co\. Supply Crate Key/i;

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
// some other item's popover elsewhere on the same stats page).
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

  // stntrading.eu keeps a crate's case/series number as part of the
  // name (see rawTitle/stnName below); mannco.store/skinport.com only
  // want it for ambiguous multi-series names (see resolveCrateSeries()).
  const rawTitle = titleEl.textContent.trim();
  const fullDisplayName = rawTitle.replace(CRATE_NUMBER_RE, "");
  const bareName = fullDisplayName.replace(/^Non-Craftable\s+/i, "");

  let { crateNumber, isAmbiguous } = await resolveCrateSeries(rawTitle, bareName);
  if (crateNumber == null) {
    // Stats-page fallback (see getCrateNumberFromStatsUrl's own doc) —
    // only ever fires for ambiguous multi-series families.
    const fromUrl = getCrateNumberFromStatsUrl(fullDisplayName);
    if (fromUrl != null) { crateNumber = fromUrl; isAmbiguous = true; }
  }
  const manncoSkinportCrateNumber = isAmbiguous ? crateNumber : undefined;

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
    : mannCoStoreUrl({ name: fullDisplayName, quality: qualityName, crateNumber: manncoSkinportCrateNumber });

  // skinport.com wants the same full descriptive name mannco.store does
  // (quality/killstreak/Festivized/Non-Craftable text baked in) — no
  // Unusual effect name is reliably available from this popover either,
  // so skip skinport.com for Unusual items for the same reason.
  const skinportHref = qualityName === "Unusual"
    ? null
    : skinportUrl({ name: fullDisplayName, quality: qualityName, crateNumber: manncoSkinportCrateNumber });

  // stntrading.eu bakes craftability into its own name/prefix — strip
  // "Non-Craftable " back out of the title so it isn't duplicated. It
  // also has no separate item page per Festivized variant or killstreak
  // tier — a weapon's page lists every killstreak tier together, and
  // Festivized items are just listed under the base item's page — so
  // both are stripped too. Neither is anchored to the start: "Festivized"
  // and the killstreak-tier words don't always lead (e.g. "Vintage
  // Festivized Professional Killstreak Kritzkrieg" — quality word
  // first), unlike Non-Craftable, which always does. The killstreak
  // alternatives are ordered longest-first so "Professional Killstreak"
  // doesn't get half-matched by the plain "Killstreak" alternative.
  // Built from rawTitle, not fullDisplayName — unlike mannco.store,
  // stntrading.eu keeps a crate's case/series number as part of the name.
  const stnName = rawTitle
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "");

  const links = [
    { label: "mannco.store", href: manncoHref },
    { label: "stntrading.eu", href: stnTradingUrl({ name: stnName, craftable, isAmbiguousSeries: isAmbiguous }) },
    { label: "skinport.com", href: skinportHref },
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

  // crate.tf needs a network fetch (defindex lookup) and only has pages
  // for crates/cases — appended separately afterward so it never blocks
  // the synchronous links above, and skipped if this popover's gone by
  // the time it resolves. crateTfUrl() wants the bare schema name (no
  // "Non-Craftable " prefix — unlike mannco.store/skinport.com, it
  // takes craftability as its own separate field instead), so that's
  // stripped back out here even though fullDisplayName keeps it.
  if (crateNumber != null || !craftable) {
    crateTfUrl({ name: fullDisplayName.replace(/^Non-Craftable\s+/i, ""), crateNumber, craftable })
      .then((href) => {
        if (href && dd.isConnected) appendLink(dd, { label: "crate.tf", href });
      })
      .catch((err) => console.warn("[TF2Utils] crate.tf link failed:", err));
  }
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
