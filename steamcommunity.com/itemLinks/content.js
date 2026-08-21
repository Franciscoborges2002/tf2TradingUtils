// itemLinks.js
import { COLOR_PANEL_BG, COLOR_DANGER, SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import { TF2_APPID, TF2_CONTEXTID, TF2_QUALITY_NAMES } from "../../utils/constants/tf2Economy.js";
import { isTf2InventoryActive, isOwnInventory } from "../../utils/steamInventory.js";
import {
  steamMarketUrl,
  backpackStatsUrl,
  stnTradingUrl,
  mannCoStoreUrl,
  marketplaceTfUrl,
  skinportUrl,
  crateTfUrl,
  backpackSellUrl,
} from "../../utils/itemLinks.js";
import { getKnownCrateNumber, isAmbiguousCrateName, resolveCrateSeries, CRATE_NUMBER_RE, IS_CRATE_CASE_RE } from "../../utils/tf2ItemSchema.js";
import { getSettings } from "../../utils/settings.js";
import { STEAMCOMMUNITY_CANT_GENERATE_ITEMLINKS } from "../../utils/constants/messages.js";

const LINK_ACCENTS = {
  "Market": SITE_BRAND_COLORS.steam,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "bp.tf history": SITE_BRAND_COLORS.backpackTf,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
};

function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  const h0 = c0?.querySelector("h1");
  if (h0) return { container: c0, title: h0 };

  const h1 = c1?.querySelector("h1");
  if (h1) return { container: c1, title: h1 };

  return null;
}

/**
 * The item's "Tags:" line, split into individual words (e.g. "Tags:
 * Unique, Crate, Bone-Chilling Bonanza Collection, Tradable,
 * Marketable" -> ["Unique", "Crate", ..., "Tradable", "Marketable"]) —
 * the one reliable structured signal this page gives for both quality
 * and tradability, shared by getQualityFromTags() and isTradable() below.
 */
function getTags(container) {
  const tagsEl = [...container.querySelectorAll("span")]
    .find((el) => el.textContent.trim().startsWith("Tags:"));
  if (!tagsEl) return null;

  return tagsEl.textContent.replace(/^Tags:\s*/, "").split(",").map((t) => t.trim());
}

/** Reads the quality word off the item's "Tags:" line, used instead of assuming every item is Unique quality. */
function getQualityFromTags(tags) {
  return tags ? TF2_QUALITY_NAMES.find((q) => tags.includes(q)) || null : null;
}

/**
 * Steam shows a renamed item's custom name-tag text in its own <h1>
 * title, not the item's real name (e.g. an Australium Flame Thrower
 * nicknamed "'Smolder'n Skunk Spray'" shows that as its h1). The "This
 * item has been renamed. Original name: "X"" notice doesn't fully fix
 * this either — it only gives the bare weapon name ("Flame Thrower"),
 * with no quality/killstreak-tier/Australium/Festivized. Detected via
 * that notice's text content, not its CSS module classes, which look
 * auto-generated per Steam build and aren't safe to depend on. Used by
 * showItemLinks() only to decide whether the item is identifiable at
 * all (see `cannotIdentify` there) — getMarketListingName() below is
 * the real fix, recovering the true full name a different way, and is
 * tried first every time regardless of whether this notice is present.
 */
function getRenamedOriginalName(container) {
  const match = container.textContent.match(/This item has been renamed\.\s*Original name:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * The item's real full descriptive name (quality/killstreak-tier/
 * Australium/Festivized/Non-Craftable all baked in, exactly as Steam
 * Market shows it) — read from the page's own "View in Community
 * Market" link href instead of the h1 title. Unlike the h1, that link's
 * market_hash_name is never overridden by a custom name tag: confirmed,
 * a renamed "'Smolder'n Skunk Spray'" (real item: Strange Australium
 * Flame Thrower) still links to
 * ".../market/listings/440/Strange%20Australium%20Flame%20Thrower"
 * here — the one place Australium survives at all once a name tag's
 * involved, since neither the h1 nor the "Original name" notice (see
 * getRenamedOriginalName() above) carry it.
 *
 * Only present for tradable + marketable items — null otherwise
 * (currency, e.g., has no Market listing at all), and explicitly
 * excludes our own injected "Market" button, which points to this same
 * URL pattern and would otherwise be matched right back.
 */
function getMarketListingName(container) {
  const marketLink = [...container.querySelectorAll(`a[href*="/market/listings/${TF2_APPID}/"]`)]
    .find((a) => !a.classList.contains("custom-link-btn"));
  if (!marketLink) return null;

  const match = (marketLink.getAttribute("href") || "").match(
    new RegExp(`/market/listings/${TF2_APPID}/(.+)$`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Non-Tradable items (gifted/trade-locked, etc.) can't be listed for
 * sale on backpack.tf at all — a missing "Tags:" line (e.g. currency,
 * which doesn't show one) is assumed tradable rather than blocking the
 * button on a signal that just isn't there for that item type.
 */
function isTradable(tags) {
  return tags ? tags.includes("Tradable") : true;
}

/**
 * The item's asset id — needed for the backpack.tf/next.backpack.tf
 * History links and the "List on backpack.tf" button, none of which are
 * name-based like everything else here.
 *
 * Primary source: the left-hand inventory grid's own tile for this
 * item, whose id is the classic Steam shape "<appid>_<contextid>_<assetId>"
 * (e.g. "440_2_17378907398", confirmed against a real tile) — Steam
 * marks whichever tile is currently shown in this info panel with its
 * own "activeInfo" class, so that's how the right one's found among
 * every other item in the inventory.
 *
 * Falls back to the "Inspect in Game" link's steam://...+tf_econ_item_preview
 * %20S<steamid>A<assetId>D<d> URI, in case the grid tile isn't found for
 * some reason — but that link is the weaker signal of the two: several
 * confirmed items (Keys, Vintage Tribalman's Shiv) don't have one at
 * all, which used to mean no asset id — and so no History/List
 * button — for them.
 */
function getAssetId(container) {
  const activeTile = document.querySelector(`.item.app${TF2_APPID}.context${TF2_CONTEXTID}.activeInfo`);
  const fromTile = activeTile?.id.match(/^\d+_\d+_(\d+)$/)?.[1];
  if (fromTile) return fromTile;

  //fallback
  const inspectLink = container.querySelector('a[href*="tf_econ_item_preview"]');
  if (!inspectLink) return null;
  const match = (inspectLink.getAttribute("href") || "").match(/A(\d+)D/);
  return match ? match[1] : null;
}

/**
 * Parses the item's full display name down to the bare schema name,
 * plus the attributes the query-param-based links (next Bp Stats,
 * marketplace.tf) need. Unlike backpack.tf's hover popover, Steam's own
 * name literally includes Non-Craftable/Festivized/killstreak-tier/
 * quality/Australium text — so, similar to stntrading.eu/itemLinks,
 * it's all parsed straight out of the name, in the order Steam shows
 * them.
 *
 * @param {string} rawName
 * @param {string|null} qualityFromTags - from getQualityFromTags(); "Unique" assumed if not found
 */
function parseItemName(rawName, qualityFromTags) {
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

  const quality = qualityFromTags || "Unique";
  if (qualityFromTags && qualityFromTags !== "Unique" && qualityFromTags !== "Unusual" && name.startsWith(`${quality} `)) {
    name = name.slice((quality + " ").length);
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

export function showItemLinks() {
  // A Steam account's inventory page lists every game it owns items
  // for, switchable via tabs — #iteminfo0/#iteminfo1 are shared across
  // all of them, so without this check, clicking an item on some other
  // game's tab (CS2, etc.) would build TF2 links for whatever text
  // happens to be in its name/title, which is meaningless there.
  if (!isTf2InventoryActive()) return false;

  const picked = pickContainer();
  if (!picked) return false;

  const { container, title } = picked;

  // #116: a name-tagged item's h1 shows the custom name, not the real
  // one — getMarketListingName() recovers the true name (Australium
  // included) from the page's own Market link instead, which a name
  // tag never overrides. Only items with no Market listing at all
  // (non-marketable) have no way to recover it — for a renamed one of
  // those, cannotIdentify below skips the links entirely rather than
  // building them wrong.
  const marketListingName = getMarketListingName(container);
  const itemName = marketListingName || title.textContent.trim();
  if (!itemName) return false;

  const cannotIdentify = !marketListingName && !!getRenamedOriginalName(container);

  // remove old injected content if item changed
  const prev = container.dataset.injectedFor || "";
  if (prev !== itemName) {
    container.querySelectorAll(".custom-market-links, .custom-sell-btn, .custom-error-msg").forEach((n) => n.remove());
  }

  // Prevent duplicate for the same item — but the item info panel is
  // rendered by Steam's own framework and re-renders its content at
  // least once (e.g. once price data streams in), wiping out anything
  // we injected while leaving the container node (and its dataset)
  // intact. So don't just trust the marker — confirm our own content is
  // actually still there before skipping.
  if (container.dataset.injectedFor === itemName && container.querySelector(".custom-market-links, .custom-error-msg")) {
    return true;
  }

  const tags = getTags(container);
  const assetId = getAssetId(container);

  // Given its own standalone CTA button (not just another row entry
  // like everything else here) — this is the one action a user's
  // actually likely to take right from their own inventory, unlike the
  // rest of these links, which are just reference/price-check lookups.
  // Skipped for Non-Tradable items (gifted/trade-locked, etc.) — they
  // can't be listed for sale at all — and for someone else's inventory,
  // where there's nothing of yours to list. Only needs the asset id, not
  // the item's name/attributes, so it still works even when those
  // couldn't be identified below.
  const sellUrl = assetId && isTradable(tags) && isOwnInventory() ? backpackSellUrl(assetId) : null;
  const anchorEl = sellUrl ? makeSellButton(sellUrl) : title;
  if (sellUrl) title.insertAdjacentElement("afterend", anchorEl);

  if (cannotIdentify) {
    const errorEl = makeErrorMessage(STEAMCOMMUNITY_CANT_GENERATE_ITEMLINKS);
    anchorEl.insertAdjacentElement("afterend", errorEl);
    container.dataset.injectedFor = itemName;
    return true;
  }

  // Crate/case series number ("Series #N"/"#N") trails at the very end,
  // after everything else — turns out this page's item name DOES show
  // it as literal text after all (e.g. "Mann Co. Supply Munition #103"),
  // contrary to what this file used to assume. Stripped before
  // parseItemName() so attrs.name ends up the true bare schema name
  // ("Mann Co. Supply Munition"), not "<name> #103" — mannco.store/
  // skinport.com want it gone from the name too (they take it as their
  // own separate crateNumber option instead). stntrading.eu still gets
  // the raw itemName below, since stnTradingUrl() re-derives the number
  // from that text itself.
  const bareDisplayName = itemName.replace(CRATE_NUMBER_RE, "");
  const attrs = parseItemName(bareDisplayName, getQualityFromTags(tags));

  const marketUrl = steamMarketUrl(itemName);

  const links = document.createElement("div");
  links.className = "custom-market-links";
  links.style.marginTop = "8px";
  links.style.display = "flex";
  links.style.flexWrap = "wrap";
  links.style.gap = "8px";

  const linkList = [
    { label: "Market", href: marketUrl },
  ].filter((link) => link.href);

  linkList.forEach((link) => links.appendChild(makeLinkBtn(link)));

  anchorEl.insertAdjacentElement("afterend", links);
  container.dataset.injectedFor = itemName;

  // mannco.store/skinport.com/stntrading.eu/bp.tf stats/history/
  // marketplace.tf/crate.tf all need something async first (a settings
  // read, a network fetch — defindex lookup — or the crate-series check
  // below) — all appended separately afterward, since showItemLinks()
  // itself isn't async, so they never block the Market link above;
  // skipped if the user's clicked a different item (or this one's panel
  // got re-rendered) by the time they resolve.
  (async () => {
    const settings = await getSettings();

    // Confirmed: unlike what this file used to assume, this page's own
    // item name DOES show a crate/case's series number as literal
    // trailing text (e.g. "Mann Co. Supply Munition #103") — so
    // resolveCrateSeries() (the same rawText/bareName extraction
    // backpack.tf's popover/tooltip use) is the primary source here,
    // with getKnownCrateNumber()'s bundled table only as a fallback for
    // whatever genuinely doesn't show it (see that function's own doc).
    let crateNumber = null;
    let isAmbiguous = false;
    const looksLikeCrate = IS_CRATE_CASE_RE.test(attrs.name) && !/\bkey\b/i.test(attrs.name);
    if (looksLikeCrate) {
      ({ crateNumber, isAmbiguous } = await resolveCrateSeries(itemName, attrs.name));
      if (crateNumber == null) {
        const fromTable = await getKnownCrateNumber(attrs.name);
        if (fromTable != null) {
          crateNumber = fromTable;
          isAmbiguous = await isAmbiguousCrateName(attrs.name);
        }
      }
    }

    // mannco.store/skinport.com only want that series number for the
    // ambiguous case (a name shared by several different series) — see
    // mannCoStoreUrl()/skinportUrl()'s own docs.
    if (attrs.quality !== "Unusual") {
      const manncoHref = mannCoStoreUrl(bareDisplayName, undefined, { crateNumber: isAmbiguous ? crateNumber : undefined });
      if (manncoHref && links.isConnected) links.appendChild(makeLinkBtn({ label: "mannco.store", href: manncoHref }));

      const skinportHref = skinportUrl(bareDisplayName, undefined, { crateNumber: isAmbiguous ? crateNumber : undefined });
      if (skinportHref && links.isConnected) links.appendChild(makeLinkBtn({ label: "skinport.com", href: skinportHref }));
    }

    // stntrading.eu keeps the "#N"/"Series #N" suffix as part of the
    // name (it has a separate page per series/case number) — needs the
    // raw itemName here, not bareDisplayName, so it can find that text
    // itself and re-attach it correctly (see stnTradingUrl()'s own doc).
    const stnUrl = stnTradingUrl(itemName, undefined, { craftable: attrs.craftable, isAmbiguousSeries: isAmbiguous });
    if (stnUrl && links.isConnected) links.appendChild(makeLinkBtn({ label: "stntrading.eu", href: stnUrl }));

    // Single "bp.tf stats"/"bp.tf history" pair, following the popup's
    // "Default bp.tf version" setting.
    const bpStatsHref = settings.bpTfVersion === "next"
      ? backpackStatsUrl(attrs.name, attrs.quality, {
          craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, crateNumber: crateNumber ?? undefined, next: true,
        })
      : backpackStatsUrl(ksPrefixFor(attrs.ksTier) + (attrs.australium ? "Australium " : "") + attrs.name, attrs.quality, {
          craftable: attrs.craftable, crateNumber: crateNumber ?? undefined,
        });
    if (links.isConnected) links.appendChild(makeLinkBtn({ label: "bp.tf stats", href: bpStatsHref }));

    const bpHistoryHref = assetId
      ? `https://${settings.bpTfVersion === "next" ? "next." : ""}backpack.tf/item/${assetId}`
      : null;
    if (bpHistoryHref && links.isConnected) links.appendChild(makeLinkBtn({ label: "bp.tf history", href: bpHistoryHref }));

    const href = await marketplaceTfUrl(attrs.name, attrs.quality, {
      craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, festivized: attrs.festive,
      crateNumber: crateNumber ?? undefined,
    });
    if (href && links.isConnected) links.appendChild(makeLinkBtn({ label: "marketplace.tf", href }));

    // crate.tf only has pages for crates/cases. crateTfUrl() itself has
    // no "is this actually a crate" check — it trusts the caller: any
    // non-craftable item at all (e.g. "Non-Craftable Duck Journal")
    // would otherwise resolve a real defindex and get a bogus
    // ".../uncraftable" crate.tf link, since crateNumber == null but
    // craftable is false either way. crateNumber != null already
    // implies looksLikeCrate (it's only ever set inside that branch
    // above), so this only actually changes anything for the
    // !craftable case — same fix already applied in backpack.tf
    // oldUI/newUI and scrap.tf/itemLinks.
    if (looksLikeCrate && (crateNumber != null || !attrs.craftable)) {
      const crateTfHref = await crateTfUrl(attrs.name, undefined, { crateNumber, craftable: attrs.craftable });
      if (crateTfHref && links.isConnected) links.appendChild(makeLinkBtn({ label: "crate.tf", href: crateTfHref }));
    }
  })().catch((err) => console.warn("[TF2Utils] extra item link failed:", err));

  return true;
}

function makeLinkBtn({ label, href }) {
  const a = document.createElement("a");
  a.className = "custom-link-btn";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;" +
    "padding:6px 12px;border-radius:6px;text-decoration:none;" +
    `background:${COLOR_PANEL_BG};color:#ffffff;font-weight:600;font-size:12px;` +
    "border:1px solid rgba(255,255,255,0.15);transition:0.15s ease;" +
    `border-left:3px solid ${LINK_ACCENTS[label] || "#999"};`;

  a.addEventListener("mouseenter", () => { a.style.filter = "brightness(1.15)"; });
  a.addEventListener("mouseleave", () => { a.style.filter = "none"; });

  return a;
}

/**
 * "List on backpack.tf" — a filled, full-width CTA button rather than
 * just another entry in the .custom-market-links row, so it actually
 * stands out as the one action worth taking (list this item for sale)
 * instead of blending into the pile of reference/price-check links.
 */
function makeSellButton(href) {
  const a = document.createElement("a");
  a.className = "custom-sell-btn";
  a.textContent = "List on backpack.tf";
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.style.cssText =
    "display:flex;align-items:center;justify-content:center;" +
    "margin-top:10px;padding:10px 16px;border-radius:8px;text-decoration:none;" +
    `background:${SITE_BRAND_COLORS.backpackTf};color:#ffffff;font-weight:700;font-size:13px;` +
    "letter-spacing:0.02em;border:none;transition:0.15s ease;box-shadow:0 2px 8px rgba(0,0,0,0.3);";

  a.addEventListener("mouseenter", () => { a.style.filter = "brightness(1.15)"; a.style.transform = "translateY(-1px)"; });
  a.addEventListener("mouseleave", () => { a.style.filter = "none"; a.style.transform = "none"; });

  return a;
}

/**
 * Shown in place of the reference-links row (see showItemLinks()'s
 * `cannotIdentify` branch) — a renamed item with no Market listing to
 * recover its real name from, so there's nothing reliable left to build
 * those links out of.
 */
function makeErrorMessage(text) {
  const div = document.createElement("div");
  div.className = "custom-error-msg";
  div.textContent = text;
  div.style.cssText =
    "margin-top:8px;padding:8px 12px;border-radius:6px;" +
    `background:${COLOR_DANGER}26;color:#e8b4b3;font-size:12px;` +
    `border:1px solid ${COLOR_DANGER}66;`;

  return div;
}
