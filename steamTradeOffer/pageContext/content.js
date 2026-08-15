/**
 * @TF2TradingUtils - steamTradeOffer/pageContext/content.js
 * Runs in the PAGE'S JS context (world: "MAIN").
 *
 * Each item in ctx.inventory.rgInventory already contains all needed fields:
 *   item.id              → assetid  (map key: "item440_2_{id}")
 *   item.name
 *   item.market_hash_name
 *   item.name_color
 *   item.icon_url
 *   item.icon_url_large
 *
 * No rgDescriptions lookup needed.
 *
 * This file runs as a classic (non-module) content script — it's
 * declared directly in manifest.json without "type": "module", so it
 * can't use a static `import`. TF2_APPID/TF2_CONTEXTID below are a
 * manually-synced local copy of utils/constants/tf2Economy.js; keep
 * them in sync if that file ever changes.
 */

const TF2_APPID     = 440;
const TF2_CONTEXTID = 2;

const g_myItemMap      = new Map();
const g_partnerItemMap = new Map();

let g_partnerMapBuilt = false;

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────
(function init() {
  const myCtx = window.g_rgAppContextData?.[TF2_APPID]?.rgContexts?.[TF2_CONTEXTID];
  console.log("[TF2TradingUtils] myCtx:", myCtx);

  waitForInventory(myCtx, "me", (ctx) => {
    buildMap(ctx, g_myItemMap, "me");
    console.log(`[TF2TradingUtils] me map ready — ${g_myItemMap.size} items`);
    window.dispatchEvent(new CustomEvent("tf2utils_my_inventory_ready"));
    maybeRunOneClickOffer();
  });

  const theirTab = document.getElementById("inventory_select_their_inventory");
  if (theirTab) {
    theirTab.addEventListener("click", onTheirInventoryClick);
  } else {
    waitForElement("inventory_select_their_inventory", (el) => {
      el.addEventListener("click", onTheirInventoryClick);
    });
  }
})();

// ─────────────────────────────────────────────────────────────
// One-Click Offer (backpack.tf)
// If this page was opened via the backpack.tf "One-Click Offer"
// button, the URL carries our own "tf2u_price" param, plus either
// Steam's native "for_item" (sell listing — buying their item) or
// our own "tf2u_item_name" (buy order — selling one of ours). Only
// exact-denomination currency matching (no change-making) — if
// either side is short, this alerts and sends nothing. Sends by
// POSTing directly to the same endpoint Steam's own "Make Offer"
// button uses, bypassing the trade UI entirely — no confirmation
// step here, Steam's mobile confirmation still applies before the
// trade actually goes through.
// ─────────────────────────────────────────────────────────────
// Manually-synced local copy of utils/constants/tf2Economy.js'
// TF2_CURRENCY names — see the file header for why this can't just
// import it.
const CURRENCY_SHORT_TO_NAME = {
  keys:  "Mann Co. Supply Crate Key",
  ref:   "Refined Metal",
  rec:   "Reclaimed Metal",
  scrap: "Scrap Metal",
};

async function maybeRunOneClickOffer() {
  const params   = new URLSearchParams(location.search);
  const priceStr = params.get("tf2u_price");
  const forItem  = params.get("for_item");
  const itemName = params.get("tf2u_item_name");
  const intent   = params.get("tf2u_intent"); // "buy" | "sell" — required when there's no "for_item"
  const token    = params.get("token");
  if (!priceStr || (!forItem && !itemName)) return;

  const need = parsePriceString(priceStr);
  if (!need) {
    window.alert(`[TF2TradingUtils] One-Click Offer: could not parse price "${priceStr}"`);
    return;
  }

  if (forItem) {
    // Steam already knows exactly which item — no name lookup needed.
    await runSellListingOffer(forItem, need, token);
  } else if (intent === "buy") {
    await runBuyOrderOffer(itemName, need, token);
  } else if (intent === "sell") {
    await runSellListingByNameOffer(itemName, need, token);
  } else {
    window.alert('[TF2TradingUtils] One-Click Offer: missing "tf2u_intent" — could not tell buy from sell.');
  }
}

// Sell listing, item assetid known from "for_item" — we're buying
// their item, paying with our own currency.
async function runSellListingOffer(forItem, need, token) {
  const itemMatch = forItem.match(/^(\d+)_(\d+)_(\d+)$/);
  if (!itemMatch) {
    window.alert("[TF2TradingUtils] One-Click Offer: could not read item from URL.");
    return;
  }
  const [, itemAppid, itemContextid, itemAssetid] = itemMatch;

  const inTrade = new Set((window.g_rgCurrentTradeStatus?.me?.assets ?? []).map((a) => a.assetid));
  const toGive  = matchCurrency(g_myItemMap, inTrade, need, "your");
  if (!toGive) return; // matchCurrency already alerted

  const items_to_give    = toGive.map((assetid) => ({ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid, amount: 1 }));
  const items_to_receive = [{ appid: Number(itemAppid), contextid: Number(itemContextid), assetid: itemAssetid, amount: 1 }];

  await sendOneClickOffer(items_to_give, items_to_receive, token);
}

// Sell listing, item identified only by name (no "for_item" — e.g.
// next.backpack.tf) — same direction as above, but the item has to be
// found by name in the seller's own inventory first.
async function runSellListingByNameOffer(itemName, need, token) {
  await ensurePartnerInventoryLoaded();

  const theirItem = findItemByName(g_partnerItemMap, itemName);
  if (!theirItem) {
    window.alert(`[TF2TradingUtils] One-Click Offer: could not find "${itemName}" in their inventory.`);
    return;
  }

  const inTrade = new Set((window.g_rgCurrentTradeStatus?.me?.assets ?? []).map((a) => a.assetid));
  const toGive  = matchCurrency(g_myItemMap, inTrade, need, "your");
  if (!toGive) return; // matchCurrency already alerted

  const items_to_give    = toGive.map((assetid) => ({ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid, amount: 1 }));
  const items_to_receive = [{ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid: theirItem.assetid, amount: 1 }];

  await sendOneClickOffer(items_to_give, items_to_receive, token);
}

// Buy order — we're selling one of our items, they pay us in currency.
async function runBuyOrderOffer(itemName, need, token) {
  const myItem = findItemByName(g_myItemMap, itemName);
  if (!myItem) {
    window.alert(`[TF2TradingUtils] One-Click Offer: could not find "${itemName}" in your inventory.`);
    return;
  }

  await ensurePartnerInventoryLoaded();

  const inTrade   = new Set((window.g_rgCurrentTradeStatus?.them?.assets ?? []).map((a) => a.assetid));
  const toReceive = matchCurrency(g_partnerItemMap, inTrade, need, "their");
  if (!toReceive) return; // matchCurrency already alerted

  const items_to_give    = [{ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid: myItem.assetid, amount: 1 }];
  const items_to_receive = toReceive.map((assetid) => ({ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid, amount: 1 }));

  await sendOneClickOffer(items_to_give, items_to_receive, token);
}

// Finds exact-denomination currency assetids in itemMap for the given
// { keys, ref, rec, scrap } need. Alerts and returns null if short on
// any denomination — no cross-denomination change-making.
function matchCurrency(itemMap, inTrade, need, ownerLabel) {
  const picked = [];

  for (const key of ["keys", "ref", "rec", "scrap"]) {
    const count = need[key];
    if (!count) continue;

    let found = 0;
    for (const info of itemMap.values()) {
      if (found >= count) break;
      if (inTrade.has(info.assetid)) continue;
      const name = info.market_hash_name || info.name;
      if (name !== CURRENCY_SHORT_TO_NAME[key]) continue;

      picked.push(info.assetid);
      inTrade.add(info.assetid);
      found++;
    }

    if (found < count) {
      window.alert(`[TF2TradingUtils] One-Click Offer: ${ownerLabel} inventory doesn't have enough ${CURRENCY_SHORT_TO_NAME[key]} — need ${count}, have ${found}`);
      return null;
    }
  }

  return picked;
}

// Finds an item in itemMap by display name (case: exact match, minus
// any trailing " #123" case number suffix). Used for buy orders, where
// there's no specific assetid known ahead of time.
function findItemByName(itemMap, itemName) {
  const normalized = itemName.replace(/ #\d+$/, "");
  for (const info of itemMap.values()) {
    const name = (info.market_hash_name || info.name || "").replace(/ #\d+$/, "");
    if (name === normalized) return info;
  }
  return null;
}

// Buy orders need the partner's inventory, which is normally only
// loaded lazily when the user clicks the "their inventory" tab.
// Programmatically clicking it triggers both Steam's own load and our
// existing onTheirInventoryClick handler.
function ensurePartnerInventoryLoaded() {
  return new Promise((resolve) => {
    if (g_partnerItemMap.size > 0) { resolve(); return; }

    window.addEventListener("tf2utils_their_inventory_ready", () => resolve(), { once: true });
    setTimeout(resolve, 15_000); // matches waitForInventory's own timeout

    const theirTab = document.getElementById("inventory_select_their_inventory");
    if (theirTab) {
      theirTab.click();
    } else {
      window.alert('[TF2TradingUtils] One-Click Offer: could not find the "their inventory" tab.');
      resolve();
    }
  });
}

// Parses backpack.tf's listing price string, e.g. "2 keys, 5.33 ref",
// "5.33 ref", or "2 keys", into a { keys, ref, rec, scrap } breakdown.
function parsePriceString(str) {
  const match = str.match(/^(?:(\d+)\s*keys?,?\s*)?(?:(\d+(?:\.\d+)?)\s*ref)?$/i);
  if (!match || (!match[1] && !match[2])) return null;

  const keys  = match[1] ? parseInt(match[1]) : 0;
  const metal = match[2] ? parseFloat(match[2]) : 0;

  const totalScrap = Math.round(metal * 9);
  const ref   = Math.floor(totalScrap / 9);
  const rem   = totalScrap % 9;
  const rec   = Math.floor(rem / 3);
  const scrap = rem % 3;

  return { keys, ref, rec, scrap };
}

async function sendOneClickOffer(items_to_give, items_to_receive, token) {
  if (typeof window.g_sessionID !== "string" || !window.g_ulTradePartnerSteamID) {
    window.alert("[TF2TradingUtils] One-Click Offer: Steam session data not available.");
    return;
  }

  const body = new FormData();
  body.append("sessionid", window.g_sessionID);
  body.append("serverid", "1");
  body.append("partner", window.g_ulTradePartnerSteamID);
  body.append("tradeoffermessage", "");
  body.append("json_tradeoffer", JSON.stringify({
    newversion: true,
    version:    items_to_give.length + items_to_receive.length + 1,
    me:   { assets: items_to_give,    currency: [], ready: false },
    them: { assets: items_to_receive, currency: [], ready: false },
  }));
  body.append("captcha", "");
  if (token) {
    body.append("trade_offer_create_params", JSON.stringify({ trade_offer_access_token: token }));
  }

  try {
    const res  = await fetch("https://steamcommunity.com/tradeoffer/new/send", { method: "POST", body });
    const data = await res.json();

    if (data.strError) {
      window.alert("[TF2TradingUtils] One-Click Offer failed: " + data.strError);
      return;
    }

    console.log("[TF2TradingUtils] One-Click Offer sent:", data.tradeofferid);
    window.close();
  } catch (err) {
    window.alert("[TF2TradingUtils] One-Click Offer failed: " + err);
  }
}

// ─────────────────────────────────────────────────────────────
// Lazy-load partner map on tab click
// ─────────────────────────────────────────────────────────────
function onTheirInventoryClick() {
  if (g_partnerMapBuilt) return;
  g_partnerMapBuilt = true;

  const partnerCtx = window.g_rgPartnerAppContextData?.[TF2_APPID]?.rgContexts?.[TF2_CONTEXTID];
  console.log("[TF2TradingUtils] partnerCtx:", partnerCtx);

  waitForInventory(partnerCtx, "partner", (ctx) => {
    buildMap(ctx, g_partnerItemMap, "partner");
    console.log(`[TF2TradingUtils] partner map ready — ${g_partnerItemMap.size} items`);
    window.dispatchEvent(new CustomEvent("tf2utils_their_inventory_ready"));
  });
}

// ─────────────────────────────────────────────────────────────
// Poll until ctx.inventory.rgInventory is populated, then call cb
// ─────────────────────────────────────────────────────────────
function waitForInventory(ctx, label, cb, interval = 100, timeout = 15_000) {
  if (!ctx) {
    console.warn(`[TF2TradingUtils] waitForInventory(${label}): ctx is null`);
    return;
  }

  const start = Date.now();
  const timer = setInterval(() => {
    const rgInv   = ctx.inventory.rgInventory;
    const elapsed = Date.now() - start;

    if (rgInv) {
      clearInterval(timer);
      console.log(`[TF2TradingUtils] waitForInventory(${label}): ready after ${elapsed}ms`);
      cb(ctx);
      return;
    }

    if (elapsed >= timeout) {
      clearInterval(timer);
      console.warn(`[TF2TradingUtils] waitForInventory(${label}): timed out after ${timeout}ms`);
    }
  }, interval);
}

// ─────────────────────────────────────────────────────────────
// Build map — read all fields directly from each rgInventory item
// key: "item440_2_{item.id}"  (matches the slot element's id attribute)
// ─────────────────────────────────────────────────────────────
function buildMap(ctx, map, label) {
  let count = 0;

  // Use Object.entries so the KEY (assetid) becomes the element ID base,
  // not item.id which can differ in some Steam inventory formats.
  for (const [assetid, item] of Object.entries(ctx.inventory.rgInventory)) {
    const elementId = `item${TF2_APPID}_${TF2_CONTEXTID}_${assetid}`;

    map.set(elementId, {
      assetid:          assetid,
      name:             item.name             || null,
      market_hash_name: item.market_hash_name || null,
      name_color:       item.name_color        || null,
      icon_url:         toIconUrl(item.icon_url_large || item.icon_url),
    });

    count++;
  }

  console.log(`[TF2TradingUtils] buildMap(${label}): ${count} items indexed`);
}

// ─────────────────────────────────────────────────────────────
// Request handler
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_request_trade_data", (e) => {
  const eventId = e.detail?.eventId;
  if (!eventId) return;

  const result = {
    me:   readSlot("your_slots",  g_myItemMap),
    them: readSlot("their_slots", g_partnerItemMap),
  };

  console.log(`[TF2TradingUtils] request — me: ${result.me.length}, them: ${result.them.length}`, result);
  window.dispatchEvent(new CustomEvent(eventId, { detail: result }));
});

// ─────────────────────────────────────────────────────────────
// tf2utils_get_my_currency / tf2utils_get_their_currency
// Returns available currency counts in the given side's inventory
// (excluding items already placed in that side's trade slots).
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_get_my_currency", (e) => {
  respondWithAvailable(e, g_myItemMap, window.g_rgCurrentTradeStatus?.me?.assets);
});

window.addEventListener("tf2utils_get_their_currency", (e) => {
  respondWithAvailable(e, g_partnerItemMap, window.g_rgCurrentTradeStatus?.them?.assets);
});

function respondWithAvailable(e, itemMap, tradeAssets) {
  const eventId = e.detail?.eventId;
  if (!eventId) return;

  const inTrade = new Set((tradeAssets ?? []).map((a) => a.assetid));
  const counts  = { keys: 0, ref: 0, rec: 0, scrap: 0 };

  for (const info of itemMap.values()) {
    if (inTrade.has(info.assetid)) continue;
    const name = info.market_hash_name || info.name;
    if (name === "Mann Co. Supply Crate Key") counts.keys++;
    else if (name === "Refined Metal")        counts.ref++;
    else if (name === "Reclaimed Metal")      counts.rec++;
    else if (name === "Scrap Metal")          counts.scrap++;
  }

  window.dispatchEvent(new CustomEvent(eventId, { detail: counts }));
}

// ─────────────────────────────────────────────────────────────
// tf2utils_add_assets
// Adds a specific, already-known list of assetids straight to one
// side's trade — used by addItemPanel's "add everything currently
// visible" button, which reads the visible inventory tile ids directly
// off the DOM itself (an isolated-world content script can do that
// fine; only writing to Steam's own trade state needs this MAIN-world
// bridge). Skips any assetid already in the trade. Doesn't cross-check
// against g_myItemMap/g_partnerItemMap — the caller already read these
// ids from real rendered tiles, so they're known-good.
// Payload: { eventId, side: "me" | "them", assetids: string[] }
// Response: { addedCount }
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_add_assets", (e) => {
  const { eventId, side, assetids } = e.detail ?? {};
  if (!eventId) return;

  const tradeStatus = window.g_rgCurrentTradeStatus;
  const tradeAssets = side === "them" ? tradeStatus?.them?.assets : tradeStatus?.me?.assets;

  if (!tradeAssets || typeof window.RefreshTradeStatus !== "function") {
    console.warn("[TF2TradingUtils] addAssets: trade state API not available.");
    window.dispatchEvent(new CustomEvent(eventId, { detail: { addedCount: 0 } }));
    return;
  }

  const inTrade = new Set(tradeAssets.map((a) => a.assetid));
  let addedCount = 0;

  for (const assetid of assetids ?? []) {
    if (inTrade.has(assetid)) continue;
    tradeAssets.push({ appid: TF2_APPID, contextid: TF2_CONTEXTID, assetid, amount: 1 });
    inTrade.add(assetid);
    addedCount++;
  }

  if (addedCount > 0) {
    tradeStatus.version++;
    window.RefreshTradeStatus(tradeStatus);
  }

  console.log(`[TF2TradingUtils] addAssets(${side}): added ${addedCount}/${(assetids ?? []).length}`);
  window.dispatchEvent(new CustomEvent(eventId, { detail: { addedCount } }));
});

// ─────────────────────────────────────────────────────────────
// tf2utils_add_currency / tf2utils_add_their_currency
// Adds items straight into Steam's own trade state
// (window.g_rgCurrentTradeStatus.me/them.assets) and asks the page
// to redraw via RefreshTradeStatus — the same thing that happens
// when you drag an item into a trade slot. Clicking/double-clicking
// the item elements does NOT add them to the trade, only selects them.
// Payload: { keys, ref, rec, scrap }  (amounts to add)
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_add_currency", (e) => {
  const { addedAny, missing } = addCurrencyToAssets(
    g_myItemMap, window.g_rgCurrentTradeStatus?.me?.assets, "Your inventory", e.detail ?? {}
  );
  if (missing.length) {
    window.dispatchEvent(new CustomEvent("tf2utils_currency_missing", { detail: missing }));
  }
  console.log(`[TF2TradingUtils] addCurrency(me): added ${addedAny ? "some" : "no"} items, missing:`, missing);
});

window.addEventListener("tf2utils_add_their_currency", (e) => {
  const { addedAny, missing } = addCurrencyToAssets(
    g_partnerItemMap, window.g_rgCurrentTradeStatus?.them?.assets, "Their inventory", e.detail ?? {}
  );
  if (missing.length) {
    window.dispatchEvent(new CustomEvent("tf2utils_currency_missing", { detail: missing }));
  }
  console.log(`[TF2TradingUtils] addCurrency(them): added ${addedAny ? "some" : "no"} items, missing:`, missing);
});

// ─────────────────────────────────────────────────────────────
// tf2utils_clear_side
// Empties one side's trade slots entirely (not just currency),
// using the same direct trade-state write as add_currency.
// Payload: { side: "me" | "them" }
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_clear_side", (e) => {
  const side        = e.detail?.side;
  const tradeStatus = window.g_rgCurrentTradeStatus;
  const assets       = side === "me" ? tradeStatus?.me?.assets : side === "them" ? tradeStatus?.them?.assets : null;

  if (!assets || typeof window.RefreshTradeStatus !== "function") {
    console.warn("[TF2TradingUtils] clearSide: invalid side or trade state API not available", side);
    return;
  }

  if (assets.length === 0) return;

  // Removed one at a time, refreshing after each — a single bulk
  // `assets.length = 0` + one RefreshTradeStatus() call left some
  // inventory grid tiles empty afterward (confirmed live: the item
  // vanished from its slot instead of reappearing as available),
  // seemingly because Steam's own per-item "un-hide this tile" side
  // effect doesn't fully process when too many items disappear between
  // refreshes. This is slower for a large side, but correctness matters
  // more than speed for a clear action.
  while (assets.length > 0) {
    assets.pop();
    tradeStatus.version++;
    window.RefreshTradeStatus(tradeStatus);
  }

  console.log(`[TF2TradingUtils] clearSide(${side}): cleared`);
});

// ─────────────────────────────────────────────────────────────
// tf2utils_search_items
// Live search for the addItemPanel's autocomplete — matches any item
// name (not just currency), grouped by exact display name (market_hash_name
// already bakes quality/killstreak/Non-Craftable/etc. into that string,
// so two genuinely different variants naturally end up as separate
// groups here; two items that share every one of those and only differ
// in something market_hash_name doesn't carry, e.g. paint or an
// Unusual's specific spell, can't be told apart this way — same
// resolution Steam's own inventory stacking has).
// Payload: { eventId, side: "me" | "them", query }
// Response: [{ name, name_color, icon_url, count }], best matches first,
// capped to a manageable dropdown size.
// ─────────────────────────────────────────────────────────────
const ITEM_SEARCH_RESULTS_LIMIT = 20;

window.addEventListener("tf2utils_search_items", (e) => {
  const { eventId, side, query } = e.detail ?? {};
  if (!eventId) return;

  const itemMap     = side === "them" ? g_partnerItemMap : g_myItemMap;
  const tradeAssets  = side === "them" ? window.g_rgCurrentTradeStatus?.them?.assets : window.g_rgCurrentTradeStatus?.me?.assets;
  const results      = searchItems(itemMap, tradeAssets, query ?? "");

  window.dispatchEvent(new CustomEvent(eventId, { detail: results }));
});

function searchItems(itemMap, tradeAssets, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const inTrade = new Set((tradeAssets ?? []).map((a) => a.assetid));
  const groups  = new Map(); // display name -> { name, name_color, icon_url, count }

  for (const info of itemMap.values()) {
    if (inTrade.has(info.assetid)) continue;
    const name = info.market_hash_name || info.name;
    if (!name || !name.toLowerCase().includes(q)) continue;

    if (!groups.has(name)) {
      groups.set(name, { name, name_color: info.name_color, icon_url: info.icon_url, count: 0 });
    }
    groups.get(name).count++;
  }

  // Names starting with the query first, then alphabetical within each group.
  return Array.from(groups.values())
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts !== bStarts ? aStarts - bStarts : a.name.localeCompare(b.name);
    })
    .slice(0, ITEM_SEARCH_RESULTS_LIMIT);
}

// ─────────────────────────────────────────────────────────────
// tf2utils_add_item_by_name / tf2utils_add_their_item_by_name
// Adds N copies of one exact item name to the trade — same direct
// trade-state write addCurrencyToAssets() uses below, generalized to
// any name instead of the four hardcoded currency ones. The name is
// expected to be an exact display name as returned by
// tf2utils_search_items above (picked from the autocomplete dropdown),
// not raw user input — see addItemPanel/content.js.
// Payload: { name, count }
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_add_item_by_name", (e) => {
  const { addedAny, missing } = addItemsToAssets(
    g_myItemMap, window.g_rgCurrentTradeStatus?.me?.assets, "Your inventory", [e.detail ?? {}]
  );
  if (missing.length) {
    window.dispatchEvent(new CustomEvent("tf2utils_item_missing", { detail: missing }));
  }
  console.log(`[TF2TradingUtils] addItemByName(me): added ${addedAny ? "some" : "no"} items, missing:`, missing);
});

window.addEventListener("tf2utils_add_their_item_by_name", (e) => {
  const { addedAny, missing } = addItemsToAssets(
    g_partnerItemMap, window.g_rgCurrentTradeStatus?.them?.assets, "Their inventory", [e.detail ?? {}]
  );
  if (missing.length) {
    window.dispatchEvent(new CustomEvent("tf2utils_item_missing", { detail: missing }));
  }
  console.log(`[TF2TradingUtils] addItemByName(them): added ${addedAny ? "some" : "no"} items, missing:`, missing);
});

// items: [{ name, count }]
function addItemsToAssets(itemMap, tradeAssets, notLoadedLabel, items) {
  if (itemMap.size === 0) {
    return {
      addedAny: false,
      missing: [{ name: `${notLoadedLabel} not loaded yet — please wait and try again`, requested: 1, found: 0 }],
    };
  }

  if (!tradeAssets || typeof window.RefreshTradeStatus !== "function") {
    return {
      addedAny: false,
      missing: [{ name: "Steam trade API not available — try reloading the page", requested: 1, found: 0 }],
    };
  }

  const inTrade = new Set(tradeAssets.map((a) => a.assetid));
  const missing = [];
  let addedAny  = false;

  for (const { name: targetName, count } of items) {
    if (!targetName || !count) continue;
    let added = 0;

    for (const info of itemMap.values()) {
      if (added >= count) break;
      if (inTrade.has(info.assetid)) continue;
      const name = info.market_hash_name || info.name;
      if (name !== targetName) continue;

      tradeAssets.push({
        appid:     TF2_APPID,
        contextid: TF2_CONTEXTID,
        assetid:   info.assetid,
        amount:    1,
      });

      inTrade.add(info.assetid);
      added++;
      addedAny = true;
    }

    if (added < count) {
      missing.push({ name: targetName, requested: count, found: added });
    }
  }

  if (addedAny) {
    window.g_rgCurrentTradeStatus.version++;
    window.RefreshTradeStatus(window.g_rgCurrentTradeStatus);
  }

  return { addedAny, missing };
}

function addCurrencyToAssets(itemMap, tradeAssets, notLoadedLabel, amounts) {
  if (itemMap.size === 0) {
    return {
      addedAny: false,
      missing: [{ name: `${notLoadedLabel} not loaded yet — please wait and try again`, requested: 1, found: 0 }],
    };
  }

  if (!tradeAssets || typeof window.RefreshTradeStatus !== "function") {
    return {
      addedAny: false,
      missing: [{ name: "Steam trade API not available — try reloading the page", requested: 1, found: 0 }],
    };
  }

  const { keys = 0, ref = 0, rec = 0, scrap = 0 } = amounts;
  const inTrade = new Set(tradeAssets.map((a) => a.assetid));

  const toAdd = [
    ["Mann Co. Supply Crate Key", keys ],
    ["Refined Metal",             ref  ],
    ["Reclaimed Metal",           rec  ],
    ["Scrap Metal",               scrap],
  ];

  const missing = []; // items we couldn't find enough of
  let addedAny = false;

  for (const [targetName, count] of toAdd) {
    if (!count) continue;
    let added = 0;

    for (const info of itemMap.values()) {
      if (added >= count) break;
      if (inTrade.has(info.assetid)) continue;
      const name = info.market_hash_name || info.name;
      if (name !== targetName) continue;

      tradeAssets.push({
        appid:     TF2_APPID,
        contextid: TF2_CONTEXTID,
        assetid:   info.assetid,
        amount:    1,
      });

      inTrade.add(info.assetid);
      added++;
      addedAny = true;
    }

    if (added < count) {
      missing.push({ name: targetName, requested: count, found: added });
    }
  }

  if (addedAny) {
    window.g_rgCurrentTradeStatus.version++;
    window.RefreshTradeStatus(window.g_rgCurrentTradeStatus);
  }

  return { addedAny, missing };
}

// ─────────────────────────────────────────────────────────────
// Convert a Steam icon hash to a full CDN URL
// ─────────────────────────────────────────────────────────────
function toIconUrl(hash) {
  if (!hash) return null;
  if (hash.startsWith("http")) return hash;
  return `https://community.cloudflare.steamstatic.com/economy/image/${hash}`;
}

// ─────────────────────────────────────────────────────────────
// Read filled slots — O(1) map lookup per item
// ─────────────────────────────────────────────────────────────
function readSlot(containerId, itemMap) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(".itemHolder.has_item .slot_inner .item")
  ).map((itemEl) => {
    const info   = itemMap.get(itemEl.id);
    const imgSrc = itemEl.querySelector("img")?.src || null;

    console.log(`[TF2TradingUtils] slot "${itemEl.id}" → info:`, info);

    return {
      name:       info?.market_hash_name || info?.name || null,
      name_color: info?.name_color       || null,
      icon_url:   info?.icon_url || imgSrc,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Wait for a DOM element to appear
// ─────────────────────────────────────────────────────────────
function waitForElement(id, callback, timeout = 10_000) {
  const el = document.getElementById(id);
  if (el) { callback(el); return; }

  const start    = Date.now();
  const observer = new MutationObserver(() => {
    const found = document.getElementById(id);
    if (found) {
      observer.disconnect();
      callback(found);
    } else if (Date.now() - start > timeout) {
      observer.disconnect();
      console.warn(`[TF2TradingUtils] waitForElement: #${id} not found within ${timeout}ms`);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}