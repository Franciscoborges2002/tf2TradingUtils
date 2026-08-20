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
import { TF2_QUALITY_IDS, TF2_CURRENCY } from "../../../utils/constants/tf2Economy.js";
import { mannCoStoreUrl, stnTradingUrl, skinportUrl, crateTfUrl } from "../../../utils/itemLinks.js";
import { resolveCrateSeries, CRATE_NUMBER_RE, IS_CRATE_CASE_RE } from "../../../utils/tf2ItemSchema.js";

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

  // stntrading.eu keeps a crate's case/series number as part of the
  // name (see rawTitle/stnName below); mannco.store/skinport.com only
  // want it for ambiguous multi-series names (see resolveCrateSeries()).
  const rawTitle = titleEl.textContent.trim();
  const fullDisplayName = rawTitle.replace(CRATE_NUMBER_RE, "");
  const bareName = fullDisplayName.replace(/^Non-Craftable\s+/i, "");

  // Non-Tradable items (gifted/trade-locked, etc.) can't be sold on any website
  if (/Non-Tradable/i.test(fullDisplayName)) return;

  let crateNumber = null;
  let isAmbiguous = false;
  // verify if its a crate, and doesnt have the word "key"
  //if it's a crate, get the case number
  const looksLikeCrate = IS_CRATE_CASE_RE.test(fullDisplayName) && !/\bkey\b/i.test(fullDisplayName);
  if (looksLikeCrate) {
    ({ crateNumber, isAmbiguous } = await resolveCrateSeries(rawTitle, bareName));
    if (crateNumber == null) {
      // Stats-page fallback — only ever fires for ambiguous multi-series
      // families whose own stats page doesn't repeat the number in the title.
      const fromUrl = getCrateNumberFromStatsUrl(fullDisplayName);
      if (fromUrl != null) { crateNumber = fromUrl; isAmbiguous = true; }
    }
  }
  const ambiguousCrateNumber = isAmbiguous ? crateNumber : undefined;

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

  // mannco.store/skinport.com both want the full descriptive name
  // (quality/killstreak/Festivized text baked in) — exactly what the
  // popover title already is, minus "Non-Craftable " (bareName), which
  // goes through `craftable` instead so this doesn't depend on that
  // text being there. TODO: Unusual items need their effect name
  // prepended (mannCoStoreUrl()'s `effectName` option) for a correct
  // slug — this popover doesn't expose one yet, so for now Unusual
  // items just link without it.
  const links = [
    { label: "mannco.store", href: mannCoStoreUrl(bareName, qualityName, { craftable, crateNumber: ambiguousCrateNumber }) },
    { label: "stntrading.eu", href: stnTradingUrl(stnName, undefined, { craftable, isAmbiguousSeries: isAmbiguous }) },
    { label: "skinport.com", href: skinportUrl(bareName, qualityName, { craftable, crateNumber: ambiguousCrateNumber }) },
  ].filter((link) => link.href);

  // websites dedicated pages to keys
  if (TF2_CURRENCY.keys.nameRe.test(fullDisplayName)) {
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
