/*
@TF2TradingUtils
Description:
Adds bp.tf stats, bp.tf History, stntrading.eu, mannco.store and
marketplace.tf links to the item action menu (the "..." button per
item) on the Steam trade offer page (classic UI, /tradeoffer/*).
Wiki and View-in-inventory/View-in-Community-Market are already there
natively, so those aren't duplicated.

That menu is a single DOM element Steam reuses for whichever item's
action menu was last opened (its links just get their href swapped
each time) rather than a fresh one per item — so this watches those
hrefs for changes instead of trying to catch a new element being
created.

It also conveniently already carries everything needed: the asset id,
from "View in inventory"'s "...#440_2_<assetId>" fragment, and the
item's real market_hash_name, from "View in Community Market"'s own
URL — no need to ask pageContext/content.js for anything here (unlike
the rest of this page, this one native menu already exposes it all).

"View in inventory" — not "View in Community Market" — is what
identifies which item's menu is currently open: currency items
(Scrap/Reclaimed/Refined Metal) aren't listed on Steam Market at all,
so that link doesn't exist for them, and keying off it exclusively
meant metal just silently showed whichever marketable item's menu had
been open last. For those, the name instead comes from the Wiki
link's "itemredirect.php?id=<defindex>" — reverse-looked-up against
the bundled schema via getItemNameByDefindex().

Steam's own "View in Community Market" link's href is never %-encoded
(spaces are literal, not %20 — same story as the "View in Community
Market" href stntrading.eu's own itemLinks script has to guard against
elsewhere). That's harmless for most names, but for a crate's "Series
#N"/"#N" suffix, the raw "#" gets read by the browser as the start of
a URL fragment, silently truncating the link and sending the user
somewhere else entirely. Rather than trying to fix Steam's own broken
link, this adds a second, correctly-encoded Market link — but only for
names that actually contain "#", so it doesn't duplicate the native
one for every other item.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/itemLinks
*/

import { SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import {
  backpackStatsUrl,
  stnTradingUrl,
  mannCoStoreUrl,
  marketplaceTfUrl,
  steamMarketUrl,
  skinportUrl,
  crateTfUrl,
  getKnownCrateNumber,
  resolveCrateSeries,
  CRATE_NUMBER_RE,
  getItemNameByDefindex,
} from "../../utils/itemLinks.js";
import { getSettings } from "../../utils/settings.js";

const LINK_ACCENTS = {
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "bp.tf history": SITE_BRAND_COLORS.backpackTf,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "Steam Market": SITE_BRAND_COLORS.steam,
};

const GROUP_ID = "tf2utils-trade-action-links";

export function addItemLinks() {
  const observer = new MutationObserver(() => processActionMenu());
  observer.observe(document.body, {
    attributes: true, attributeFilter: ["href"], childList: true, subtree: true,
  });
  console.log("[TF2Utils] tradeOffer itemLinks: watching action menu");
}

let lastAssetId = null;

// Steam doesn't reliably reuse one single menu element — it appears to
// leave old (hidden) copies behind rather than removing them, so more
// than one element can share these ids at once. getElementById() only
// ever returns the *first* match (the oldest), which silently points
// at a stale, no-longer-visible copy — querySelectorAll() + the *last*
// match is what actually tracks the one currently open.
function getLatestMenuRefs() {
  const itemActionsEls = document.querySelectorAll('[id="trade_action_popup_itemactions"]');
  const inventoryLinks = document.querySelectorAll('[id="trade_action_viewininventory"]');
  const marketLinks = document.querySelectorAll('[id="trade_action_viewinmarket"]');
  const staticActionsEls = document.querySelectorAll('[id="trade_action_popup_staticactions"]');
  if (!inventoryLinks.length || !staticActionsEls.length) return null;

  // The Wiki link lives inside itemActions, not its own id — scoped to
  // the same (latest) instance as everything else, rather than a
  // page-wide query that could match a stale copy's Wiki link instead.
  const itemActions = itemActionsEls[itemActionsEls.length - 1] || null;
  const wikiLink = itemActions?.querySelector('a[href*="itemredirect.php"]') || null;

  return {
    viewInventoryLink: inventoryLinks[inventoryLinks.length - 1],
    viewMarketLink: marketLinks[marketLinks.length - 1] || null,
    wikiLink,
    staticActions: staticActionsEls[staticActionsEls.length - 1],
  };
}

function removeInjectedGroups() {
  document.querySelectorAll(`[id="${GROUP_ID}"]`).forEach((el) => el.remove());
}

function getAssetId(viewInventoryLink) {
  const match = (viewInventoryLink.getAttribute("href") || "").match(/#440_2_(\d+)$/);
  return match ? match[1] : null;
}

/**
 * The item's raw display name — market_hash_name (quality/killstreak-
 * tier/Non-Craftable/Festivized/Australium text baked in) when the
 * item has a Community Market link, otherwise the bare schema name
 * reverse-looked-up from the Wiki link's defindex (currency items:
 * see the file header for why they have no Market link at all).
 */
async function resolveItemName(viewMarketLink, wikiLink) {
  const marketHref = viewMarketLink?.getAttribute("href") || "";
  if (marketHref) return decodeURIComponent(marketHref.split("/").pop() || "");

  const defindexMatch = (wikiLink?.getAttribute("href") || "").match(/[?&]id=(\d+)/);
  if (!defindexMatch) return null;
  return getItemNameByDefindex(defindexMatch[1]);
}

function processActionMenu() {
  const refs = getLatestMenuRefs();
  if (!refs) return;
  const { viewInventoryLink, viewMarketLink, wikiLink, staticActions } = refs;

  const assetId = getAssetId(viewInventoryLink);
  if (!assetId) return;

  // Rebuild whenever the item changed OR our group is simply gone —
  // Steam appears to rebuild this menu's content on every open, even
  // for the same item, which wipes out anything we'd previously
  // appended. Relying on "did the item change" alone would then skip
  // re-adding it since, from that check's perspective, nothing changed.
  const groupStillThere = document.querySelectorAll(`[id="${GROUP_ID}"]`).length > 0;
  if (assetId === lastAssetId && groupStillThere) return;
  lastAssetId = assetId;

  removeInjectedGroups();

  resolveItemName(viewMarketLink, wikiLink)
    .then((rawName) => (rawName ? buildLinks(rawName, assetId) : []))
    .then((links) => {
      if (!links.length) return;

      // Re-check against whatever's actually latest right now, not the
      // node references captured when this run started — Steam may
      // have opened a different item's menu (a new instance, not just
      // a href swap on the same nodes) while resolving the name/links.
      const latest = getLatestMenuRefs();
      if (!latest || getAssetId(latest.viewInventoryLink) !== assetId) return;

      removeInjectedGroups();
      const group = document.createElement("div");
      group.id = GROUP_ID;
      links.forEach(({ label, href }) => group.appendChild(makeMenuLink(label, href)));
      latest.staticActions.insertAdjacentElement("afterend", group);
      console.log("[TF2Utils] tradeOffer itemLinks: injected links for", assetId, links);
    })
    .catch((err) => console.warn("[TF2Utils] tradeOffer itemLinks failed:", err));
}

function makeMenuLink(label, href) {
  const a = document.createElement("a");
  a.className = "popup_menu_item";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
  return a;
}

/**
 * Parses market_hash_name down to the bare schema name plus the
 * attributes the query-param-based links need. Steam bakes Non-
 * Craftable/Festivized/killstreak-tier/quality/Australium text
 * directly into it, in that order — same approach as
 * steamcommunity.com/itemLinks's parseItemName().
 */
function parseItemName(rawName) {
  let name = rawName.trim();

  const isNonCraftable = name.startsWith("Non-Craftable ");
  if (isNonCraftable) name = name.slice("Non-Craftable ".length);

  const festive = name.startsWith("Festivized ");
  if (festive) name = name.slice("Festivized ".length);

  let ksTier = 0;
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

  const QUALITY_WORDS = [
    "Genuine", "Vintage", "Community", "Valve", "Self-Made", "Customized",
    "Strange", "Completed", "Haunted", "Collector's", "Decorated Weapon",
  ];
  let quality = "Unique";
  const matchedQuality = QUALITY_WORDS.find((q) => name.startsWith(`${q} `));
  if (matchedQuality) {
    quality = matchedQuality;
    name = name.slice((matchedQuality + " ").length);
  } else if (name.startsWith("Unusual ")) {
    quality = "Unusual";
    name = name.slice("Unusual ".length);
  }

  const australium = name.startsWith("Australium ");
  if (australium) name = name.slice("Australium ".length);

  return { name, quality, craftable: !isNonCraftable, ksTier, australium, festive };
}

/** Killstreak-tier prefix text, for classic backpack.tf's stats page (which needs it baked into the name, not passed as a separate field). */
function ksPrefixFor(ksTier) {
  if (ksTier === 3) return "Professional Killstreak ";
  if (ksTier === 2) return "Specialized Killstreak ";
  if (ksTier === 1) return "Killstreak ";
  return "";
}

async function buildLinks(rawName, assetId) {
  const settings = await getSettings();

  // Strip the crate number up front for mannco.store/bp.tf stats/
  // marketplace.tf — none of those distinguish crates by it as literal
  // name text the way backpack.tf's own name does — then reattach it
  // only where wanted: bp.tf stats as a trailing path segment,
  // marketplace.tf as a "c<N>" sku modifier. stntrading.eu is the
  // opposite (a separate page per series/case number), so stnName below
  // is built from rawName instead, keeping it.
  const nameWithoutCrate = rawName.replace(CRATE_NUMBER_RE, "");
  const attrs = parseItemName(nameWithoutCrate);
  const { crateNumber, isAmbiguous } = await resolveCrateSeries(rawName, attrs.name);

  // mannco.store/skinport.com only want the crate number for ambiguous
  // multi-series names (see resolveCrateSeries()) — bp.tf stats/
  // marketplace.tf below want it regardless.
  const manncoSkinportCrateNumber = isAmbiguous ? crateNumber : undefined;

  const manncoHref = attrs.quality === "Unusual"
    ? null // no reliable Unusual effect name available from this menu
    : mannCoStoreUrl({ name: nameWithoutCrate, quality: attrs.quality, crateNumber: manncoSkinportCrateNumber });

  const skinportHref = attrs.quality === "Unusual"
    ? null // same reasoning as mannco.store above
    : skinportUrl({ name: nameWithoutCrate, quality: attrs.quality, crateNumber: manncoSkinportCrateNumber });

  const stnName = rawName
    .replace(/^Non-Craftable\s+/i, "")
    .replace(/Festivized\s+/i, "")
    .replace(/(?:Professional Killstreak|Specialized Killstreak|Killstreak)\s+/i, "");

  // Single "bp.tf stats"/"bp.tf history" pair, following the popup's
  // "Default bp.tf version" setting. The crate-number-as-trailing-
  // path-segment trick (effectId below) only exists on classic
  // backpack.tf's stats URL shape — next.backpack.tf's query-param one
  // has no equivalent (see backpackStatsUrl()'s own doc), so the next
  // variant is just less precise for crates, same gap as everywhere
  // else next.backpack.tf is used.
  const bpStatsHref = settings.bpTfVersion === "next"
    ? backpackStatsUrl({
        name: attrs.name, quality: attrs.quality, craftable: attrs.craftable,
        ksTier: attrs.ksTier, australium: attrs.australium, next: true,
      })
    : backpackStatsUrl({
        name: ksPrefixFor(attrs.ksTier) + (attrs.australium ? "Australium " : "") + attrs.name,
        quality: attrs.quality,
        craftable: attrs.craftable,
        effectId: crateNumber ?? undefined,
      });
  const bpHistoryHref = assetId
    ? `https://${settings.bpTfVersion === "next" ? "next." : ""}backpack.tf/item/${assetId}`
    : null;

  const links = [
    { label: "bp.tf stats", href: bpStatsHref },
    { label: "bp.tf history", href: bpHistoryHref },
    { label: "stntrading.eu", href: stnTradingUrl({ name: stnName, craftable: attrs.craftable, isAmbiguousSeries: isAmbiguous }) },
    { label: "mannco.store", href: manncoHref },
    { label: "skinport.com", href: skinportHref },
    // Only for names Steam's own (unescaped) Market link would mangle
    // — see the file header for why. Everything else already has a
    // working native link, so this would just be a redundant duplicate.
    crateNumber != null ? { label: "Steam Market", href: steamMarketUrl(rawName) } : null,
  ].filter((link) => link?.href);

  try {
    // The name itself already told us the crate number when present —
    // the bundled table is only needed as a fallback for pages that
    // don't expose it at all (see getKnownCrateNumber()'s own docs).
    const resolvedCrateNumber = crateNumber ?? await getKnownCrateNumber(attrs.name);
    const marketplaceHref = await marketplaceTfUrl({
      name: attrs.name, quality: attrs.quality, craftable: attrs.craftable,
      ksTier: attrs.ksTier, australium: attrs.australium, festive: attrs.festive,
      crateNumber: resolvedCrateNumber ?? undefined,
    });
    if (marketplaceHref) links.push({ label: "marketplace.tf", href: marketplaceHref });

    // crate.tf only has pages for crates/cases — crateTfUrl() itself
    // returns null with no crate number, so this naturally stays absent
    // for every other item rather than needing its own type check here.
    const crateTfHref = await crateTfUrl({ name: attrs.name, crateNumber: resolvedCrateNumber, craftable: attrs.craftable });
    if (crateTfHref) links.push({ label: "crate.tf", href: crateTfHref });
  } catch (err) {
    console.warn("[TF2Utils] marketplace.tf/crate.tf link failed:", err);
  }

  return links;
}
