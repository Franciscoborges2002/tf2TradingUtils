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
 */

const g_myItemMap      = new Map();
const g_partnerItemMap = new Map();

let g_partnerMapBuilt = false;

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────
(function init() {
  const myCtx = window.g_rgAppContextData?.[440]?.rgContexts?.[2];
  console.log("[TF2TradingUtils] myCtx:", myCtx);

  waitForInventory(myCtx, "me", (ctx) => {
    buildMap(ctx, g_myItemMap, "me");
    console.log(`[TF2TradingUtils] me map ready — ${g_myItemMap.size} items`);
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
// Lazy-load partner map on tab click
// ─────────────────────────────────────────────────────────────
function onTheirInventoryClick() {
  if (g_partnerMapBuilt) return;
  g_partnerMapBuilt = true;

  const partnerCtx = window.g_rgPartnerAppContextData?.[440]?.rgContexts?.[2];
  console.log("[TF2TradingUtils] partnerCtx:", partnerCtx);

  waitForInventory(partnerCtx, "partner", (ctx) => {
    buildMap(ctx, g_partnerItemMap, "partner");
    console.log(`[TF2TradingUtils] partner map ready — ${g_partnerItemMap.size} items`);
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

  for (const item of Object.values(ctx.inventory.rgInventory)) {
    const elementId = `item440_2_${item.id}`;

    map.set(elementId, {
      name:             item.name             || null,
      market_hash_name: item.market_hash_name || null,
      name_color:       item.name_color        || null,
      icon_url:         toIconUrl(item.icon_url_large || item.icon_url),
      // Keep raw item ref so we can click its element to add to trade
      _item:            item,
    });

    count++;
  }

  console.log(`[TF2TradingUtils] buildMap(${label}): ${count} items indexed`);
  let i = 0;
  for (const [id, info] of map) {
    console.log(`  "${id}":`, info);
    if (++i >= 5) break;
  }
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
// tf2utils_get_my_currency
// Returns available currency counts in my inventory (excluding
// items already placed in the trade slots).
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_get_my_currency", (e) => {
  const eventId = e.detail?.eventId;
  if (!eventId) return;

  // Collect assetids already in my trade slots
  const inTrade = new Set(
    Array.from(document.querySelectorAll("#your_slots .itemHolder.has_item .slot_inner .item"))
      .map(el => el.id)
  );

  const counts = { keys: 0, ref: 0, rec: 0, scrap: 0 };

  for (const [elementId, info] of g_myItemMap) {
    if (inTrade.has(elementId)) continue;
    const name = info.market_hash_name || info.name;
    if (name === "Mann Co. Supply Crate Key") counts.keys++;
    else if (name === "Refined Metal")        counts.ref++;
    else if (name === "Reclaimed Metal")      counts.rec++;
    else if (name === "Scrap Metal")          counts.scrap++;
  }

  window.dispatchEvent(new CustomEvent(eventId, { detail: counts }));
});

// ─────────────────────────────────────────────────────────────
// tf2utils_add_currency
// Clicks item elements to add them to the trade.
// Payload: { keys, ref, rec, scrap }  (amounts to add)
// Uses largest denominations first, delays between clicks so
// Steam's UI can keep up.
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_add_currency", (e) => {
  const { keys = 0, ref = 0, rec = 0, scrap = 0 } = e.detail ?? {};

  const inTrade = new Set(
    Array.from(document.querySelectorAll("#your_slots .itemHolder.has_item .slot_inner .item"))
      .map(el => el.id)
  );

  const toAdd = [
    ["Mann Co. Supply Crate Key", keys ],
    ["Refined Metal",             ref  ],
    ["Reclaimed Metal",           rec  ],
    ["Scrap Metal",               scrap],
  ];

  const queue   = [];
  const missing = []; // items we couldn't find enough of

  for (const [targetName, count] of toAdd) {
    if (!count) continue;
    let added = 0;
    for (const [elementId, info] of g_myItemMap) {
      if (added >= count) break;
      if (inTrade.has(elementId)) continue;
      const name = info.market_hash_name || info.name;
      if (name !== targetName) continue;
      // Use the raw item's element — Steam's click handlers are bound to this
      const el = info._item?.element ?? document.getElementById(elementId);
      if (el) { queue.push(el); inTrade.add(elementId); added++; }
    }
    if (added < count) {
      missing.push({ name: targetName, requested: count, found: added });
    }
  }

  // Fire missing event back to isolated world if needed
  if (missing.length) {
    window.dispatchEvent(new CustomEvent("tf2utils_currency_missing", { detail: missing }));
  }

  // Click each item with a small delay so Steam processes each one
  queue.forEach((el, i) => {
    setTimeout(() => el.click(), i * 75);
  });

  console.log(`[TF2TradingUtils] addCurrency: queued ${queue.length} clicks, missing:`, missing);
});
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