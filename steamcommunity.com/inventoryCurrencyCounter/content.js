/**
 * @TF2TradingUtils - inventoryCurrencyCounter
 * On your own Steam inventory page, while viewing the TF2 (440) tab,
 * shows a running count of keys/metal (and a couple of notable items)
 * actually in your inventory — useful since backpack.tf's own
 * inventory cache can lag behind or fail to refresh.
 *
 * Shows a count right away from steamcommunity.com/inventoryFetchBridge
 * — it already observes the page's own calls to the same inventory
 * endpoint (steamcommunity.com/inventory/<steamid64>/440/2?...) for
 * unusualEffectBackground's grid-cell support, so this first count
 * costs no request of its own. Steam only progressively loads pages as
 * the user scrolls though, so that first count can be partial — the
 * bridge's first response also carries the inventory's real
 * total_inventory_count, so this immediately knows exactly how partial.
 *
 * Never fetches on its own beyond that — every automatic re-render
 * (mutation observer, tab switch, or the bridge observing more of the
 * inventory) only ever re-reads the bridge's data, so an already
 * partial count updates itself for free as the user scrolls, with no
 * request of this script's own. Only clicking ↻ Refresh makes an
 * actual request: sized off total_inventory_count (e.g. 2539) and
 * capped at 2000 (confirmed live: a single request for the exact
 * total, 2539, failed — 2000 didn't), so a large inventory takes a
 * couple of big requests (2000 + 539) instead of looping through it 75
 * at a time. Success replaces the panel with that authoritative count;
 * a failure leaves the bridge-based estimate up with a hint to click
 * Refresh again. Falls back to 75-item pages (Steam's own page size)
 * only if total_inventory_count isn't known yet.
 *
 * Items are matched by their real market_hash_name (no per-item icon
 * hash to hunt down, unlike the earlier icon-hash-matching approach).
 *
 * Also tracks a small list of notable non-currency items (currently
 * just Earbuds), matched by name the same way. Kept local to this
 * file rather than in utils/constants/tf2Economy.js since it's
 * specific to this one script's interest, not shared TF2 economy data.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/inventoryCurrencyCounter
 */

import { TF2_APPID, TF2_CONTEXTID, TF2_CURRENCY } from "../../utils/constants/tf2Economy.js";
import { COLOR_ACCENT, COLOR_METAL, COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { getSettings } from "../../utils/settings.js";

const PANEL_ID  = "tf2utils-inv-currency-panel";
const STYLES_ID = "tf2utils-inv-currency-styles";

const TRACKED_ITEMS = {
  earbuds: {
    name:     "Earbuds",
    short:    "Earbuds",
    iconHash: "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEObRUTSB_xhzRCms_jQ_HaCeJSn99svMUMjm84kFUuYLWxMzZhdFCbUKZfCqVirVq5CHM0u58tRNmx2VWx5ls",
  },
};

// market_hash_name -> our short key ("keys"/"ref"/.../"earbuds")
const NAME_TO_KEY = {
  ...Object.fromEntries(Object.entries(TF2_CURRENCY).map(([key, c]) => [c.name, key])),
  ...Object.fromEntries(Object.entries(TRACKED_ITEMS).map(([key, item]) => [item.name, key])),
};

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    #${PANEL_ID} {
      margin: 8px 0;
      padding: 8px 12px;
      border-radius: 6px;
      background: ${COLOR_PANEL_BG};
      border: 1px solid rgba(255,255,255,0.1);
      font: 12px / 1.4 "Motiva Sans", system-ui, Segoe UI, Roboto, sans-serif;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tf2utils-inv-currency-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .tf2utils-inv-currency-title {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,0.4);
      flex: 1;
    }
    .tf2utils-inv-currency-refresh {
      background: none;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 4px;
      color: rgba(255,255,255,0.4);
      font-size: 10px;
      padding: 2px 6px;
      cursor: pointer;
    }
    .tf2utils-inv-currency-refresh:hover {
      border-color: ${COLOR_ACCENT};
      color: ${COLOR_ACCENT};
    }
    .tf2utils-inv-currency-chip {
      font-weight: 700;
      font-size: 13px;
    }
    .tf2utils-inv-currency-breakdown {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.75);
    }
    .tf2utils-inv-currency-icon {
      width: 20px;
      height: 20px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .tf2utils-inv-currency-hint {
      font-size: 10px;
      font-style: italic;
      color: rgba(255,255,255,0.3);
    }
  `;
  document.head.appendChild(style);
}

/** The inventory owner's steamid64 — from the canonical link tag first
 *  (works for both /profiles/<id>/ and /id/<vanity>/ URLs), falling
 *  back to the URL path itself (only present for /profiles/ URLs, not
 *  a vanity /id/ one), and finally to #filter_options' own per-app tag
 *  containers, whose ids embed it regardless of URL shape — e.g.
 *  id="tags_76561198265368729_440_2" on a /id/<vanity>/inventory/ page. */
function getOwnerSteamId64() {
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const fromCanonical = canonical?.match(/\/profiles\/(\d{17})/)?.[1];
  if (fromCanonical) return fromCanonical;

  const fromPath = location.pathname.match(/\/profiles\/(\d{17})/)?.[1];
  if (fromPath) return fromPath;

  const tagsContainer = document.querySelector('#filter_options [id^="tags_"]');
  return tagsContainer?.id.match(/^tags_(\d{17})_/)?.[1] ?? null;
}

/** Asks inventoryFetchBridge (world: "MAIN") for whatever it's
 *  observed so far — { map, totalCount } — timing out to an empty,
 *  unknown-total state if the bridge script never responds (e.g. an
 *  older cached build without it). */
function requestInventoryState() {
  return new Promise((resolve) => {
    const eventId = `tf2utils_invmap_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => resolve({ map: new Map(), totalCount: null }), 1500);
    window.addEventListener(eventId, (e) => {
      clearTimeout(timeout);
      resolve(e.detail ?? { map: new Map(), totalCount: null });
    }, { once: true });
    window.dispatchEvent(new CustomEvent("tf2utils_inv_get_map", { detail: { eventId } }));
  });
}

/** market_hash_name -> total amount owned, straight off the bridge's
 *  own assetid -> { ...description, amount } map. */
function nameCountsFromBridgeMap(map) {
  const nameCounts = new Map();
  for (const desc of map.values()) {
    const name = desc.market_hash_name || desc.name;
    if (!name) continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + (desc.amount ?? 1));
  }
  return nameCounts;
}

/** A Map<market_hash_name, amount> -> the { keys, ref, rec, scrap, ...tracked } shape renderPanel expects. */
function countsFromNameCounts(nameCounts) {
  const counts = { keys: 0, ref: 0, rec: 0, scrap: 0 };
  for (const key of Object.keys(TRACKED_ITEMS)) counts[key] = 0;

  for (const [name, amount] of nameCounts) {
    const key = NAME_TO_KEY[name];
    if (key) counts[key] += amount;
  }

  return counts;
}

/** Quick, request-free estimate straight from inventoryFetchBridge's
 *  currently observed data, plus the inventory's own real item count
 *  (confirmed live via a real response's `total_inventory_count`,
 *  e.g. 2539) — lets the caller size its own confirming request
 *  exactly instead of guessing or paginating blindly. */
async function loadQuickCounts() {
  const { map: bridgeMap, totalCount } = await requestInventoryState();
  const counts = countsFromNameCounts(nameCountsFromBridgeMap(bridgeMap));
  const isPartial = totalCount != null && bridgeMap.size < totalCount;
  return { counts, isPartial, totalCount, loadedCount: bridgeMap.size };
}

// Steam's own page requests 75 items at a time (confirmed via
// inventoryFetchBridge's observed requests) — used as the request size
// when totalCount isn't known going in (e.g. the bridge hasn't seen a
// response at all yet).
const INVENTORY_REQUEST_COUNT = 75;

// A single request sized to the exact total_inventory_count (e.g.
// 2539) failed live — but 2000 is confirmed to work, so requests are
// capped at this size and chunked: a 2539-item inventory becomes one
// 2000 request plus one 539 request, instead of either an oversized
// single request or looping 75 at a time (~34 requests).
const MAX_INVENTORY_REQUEST_COUNT = 2000;

/** The single authoritative fetch. When `totalCount` (the inventory's
 *  own real item count, off the bridge's first observed response) is
 *  known, each request is sized to whatever's left, capped at
 *  MAX_INVENTORY_REQUEST_COUNT — so a large inventory takes a couple
 *  of big requests instead of looping in 75-item pages. Falls back to
 *  75-sized pages if totalCount wasn't known going in. Steam's own
 *  `more_items`/`last_assetid` still governs when to actually stop,
 *  regardless of the size estimate. Returns a
 *  Map<market_hash_name, amount>. */
async function fetchFullNameCounts(steamId64, totalCount) {
  const nameCounts = new Map();
  let startAssetId = null;
  let assetsSeen = 0;

  for (;;) {
    const remaining = totalCount ? totalCount - assetsSeen : null;
    const count = remaining > 0 ? Math.min(remaining, MAX_INVENTORY_REQUEST_COUNT) : INVENTORY_REQUEST_COUNT;

    const url = new URL(`https://steamcommunity.com/inventory/${steamId64}/${TF2_APPID}/${TF2_CONTEXTID}`);
    url.searchParams.set("l", "english");
    url.searchParams.set("count", String(count));
    url.searchParams.set("preserve_bbcode", "1");
    url.searchParams.set("raw_asset_properties", "1");
    if (startAssetId) url.searchParams.set("start_assetid", startAssetId);

    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`inventory request failed (HTTP ${res.status})`);

    const data = await res.json();
    if (data?.success !== 1) {
      throw new Error("inventory not available (private, or not your own?)");
    }

    const descByKey = new Map(
      (data.descriptions ?? []).map((d) => [`${d.classid}_${d.instanceid ?? "0"}`, d])
    );

    for (const asset of data.assets ?? []) {
      const desc = descByKey.get(`${asset.classid}_${asset.instanceid ?? "0"}`);
      const name = desc?.market_hash_name || desc?.name;
      if (!name) continue;

      const amount = parseInt(asset.amount, 10) || 1;
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + amount);
    }

    assetsSeen += data.assets?.length ?? 0;
    if (!data.more_items || !data.last_assetid) break;
    startAssetId = data.last_assetid;
  }

  return nameCounts;
}

// Formats a raw ref amount (possibly fractional) as decimal ref, same
// convention used elsewhere (tradeOfferPanel/showTradeDetails).
function formatRefValue(refValue) {
  const totalScrap = Math.round(refValue * 9);
  const wholeRef = Math.floor(totalScrap / 9);
  const remScrap = totalScrap % 9;
  const decimal  = String(Math.round((remScrap / 9) * 100)).padStart(2, "0");
  return `${wholeRef}.${decimal} ref`;
}

function formatTotalMetal(counts) {
  const totalScrap = counts.ref * TF2_CURRENCY.ref.scrapValue
    + counts.rec * TF2_CURRENCY.rec.scrapValue
    + counts.scrap * TF2_CURRENCY.scrap.scrapValue;
  return formatRefValue(totalScrap / 9);
}

// Everything (keys, metal, tracked items) converted to a single ref
// figure, using the prices set in the popup's Settings view. Needs a
// key price at minimum (keys and Earbuds' key component both depend
// on it) plus an Earbuds price — returns null if either is missing,
// so the caller can show a hint instead of a wrong/partial number.
function computeTotalValueRef(counts, settings) {
  const { keyPriceRef, earbudsPriceKeys, earbudsPriceRef } = settings;
  if (!keyPriceRef || (!earbudsPriceKeys && !earbudsPriceRef)) return null;

  const metalRef   = (counts.ref * TF2_CURRENCY.ref.scrapValue
    + counts.rec * TF2_CURRENCY.rec.scrapValue
    + counts.scrap * TF2_CURRENCY.scrap.scrapValue) / 9;
  const keysRef    = counts.keys * keyPriceRef;
  const earbudsRef = counts.earbuds * ((earbudsPriceKeys || 0) * keyPriceRef + (earbudsPriceRef || 0));

  return metalRef + keysRef + earbudsRef;
}

function iconUrl(hash, size = "32fx32f") {
  return `https://community.fastly.steamstatic.com/economy/image/${hash}/${size}`;
}

// Appends a text span and, if a hash is given, that denomination's icon
// right after it — used to label each figure in the total-value row
// with the currency it's expressed in.
function appendAmountIcon(container, text, hash, label) {
  const span = document.createElement("span");
  span.textContent = text;
  container.appendChild(span);

  if (!hash) return;
  const img = document.createElement("img");
  img.className = "tf2utils-inv-currency-icon";
  img.src = iconUrl(hash);
  img.alt = label;
  img.title = label;
  container.appendChild(img);
}

function renderLoading(panel) {
  panel.innerHTML = "";
  const msg = document.createElement("span");
  msg.className = "tf2utils-inv-currency-title";
  msg.textContent = "Loading inventory…";
  panel.appendChild(msg);
}

function renderError(panel, err) {
  panel.innerHTML = "";
  const msg = document.createElement("span");
  msg.className = "tf2utils-inv-currency-hint";
  msg.textContent = `[TF2TradingUtils] Could not load currency counts — ${err.message}.`;
  panel.appendChild(msg);

  const retryBtn = document.createElement("button");
  retryBtn.className = "tf2utils-inv-currency-refresh";
  retryBtn.textContent = "↻ Retry";
  retryBtn.onclick = () => reload(panel);
  panel.appendChild(retryBtn);
}

function renderPanel(panel, counts, settings, isPartial, fetchError, loadedCount, totalCount) {
  panel.innerHTML = "";

  const header = document.createElement("div");
  header.className = "tf2utils-inv-currency-row";

  const title = document.createElement("span");
  title.className = "tf2utils-inv-currency-title";
  const loadedLabel = totalCount != null ? `${loadedCount}/${totalCount} items loaded` : null;
  title.textContent = "Currency In this inventory"
    + (loadedLabel ? ` (${loadedLabel})` : (isPartial ? " (unconfirmed estimate)" : ""))
    + ":";
  header.appendChild(title);

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "tf2utils-inv-currency-refresh";
  refreshBtn.textContent = "↻ Refresh";
  refreshBtn.title = "Re-fetch the exact count straight from Steam";
  refreshBtn.onclick = () => reload(panel, { forceFullFetch: true });
  header.appendChild(refreshBtn);

  panel.appendChild(header);

  // Row: keys + total metal value + tracked items (e.g. Earbuds), all together
  const summaryRow = document.createElement("div");
  summaryRow.className = "tf2utils-inv-currency-row";

  const keysChip = document.createElement("span");
  keysChip.className = "tf2utils-inv-currency-chip";
  keysChip.style.color = COLOR_ACCENT;
  keysChip.textContent = `${counts.keys} ${TF2_CURRENCY.keys.short}`;
  summaryRow.appendChild(keysChip);

  const metalChip = document.createElement("span");
  metalChip.className = "tf2utils-inv-currency-chip";
  metalChip.style.color = COLOR_METAL;
  metalChip.textContent = `Total metal: ${formatTotalMetal(counts)}`;
  summaryRow.appendChild(metalChip);

  for (const key of Object.keys(TRACKED_ITEMS)) {
    const chip = document.createElement("span");
    chip.className = "tf2utils-inv-currency-chip";
    chip.textContent = `${counts[key]} ${TRACKED_ITEMS[key].short}`;
    summaryRow.appendChild(chip);
  }

  panel.appendChild(summaryRow);

  // Row: per-denomination breakdown — amount, then that denomination's
  // icon, repeated for ref/rec/scrap.
  const breakdown = document.createElement("div");
  breakdown.className = "tf2utils-inv-currency-breakdown";

  for (const key of ["ref", "rec", "scrap"]) {
    const amount = document.createElement("span");
    amount.textContent = counts[key];
    breakdown.appendChild(amount);

    const hash = TF2_CURRENCY[key].iconHash;
    if (hash) {
      const img = document.createElement("img");
      img.className = "tf2utils-inv-currency-icon";
      img.src = iconUrl(hash);
      img.alt = TF2_CURRENCY[key].short;
      img.title = TF2_CURRENCY[key].short;
      breakdown.appendChild(img);
    }
  }

  panel.appendChild(breakdown);

  if (fetchError) {
    const hint = document.createElement("span");
    hint.className = "tf2utils-inv-currency-hint";
    hint.textContent = `Fetching the exact count from Steam failed (${fetchError.message}) — the numbers above are just an estimate. Click ↻ Refresh to retry.`;
    panel.appendChild(hint);
  } else if (isPartial) {
    const hint = document.createElement("span");
    hint.className = "tf2utils-inv-currency-hint";
    hint.textContent = "This is only a partial count — click ↻ Refresh to fetch the exact total from Steam.";
    panel.appendChild(hint);
  }

  // Row: total inventory value in ref, using the settings prices —
  // needs both a key price and an Earbuds price set to mean anything.
  const totalValueRef = computeTotalValueRef(counts, settings);
  if (totalValueRef != null) {
    const valueRow = document.createElement("div");
    valueRow.className = "tf2utils-inv-currency-breakdown";

    const totalLabel = document.createElement("span");
    totalLabel.className = "tf2utils-inv-currency-chip";
    totalLabel.textContent = "Total currency value:";
    valueRow.appendChild(totalLabel);
    appendAmountIcon(valueRow, formatRefValue(totalValueRef), TF2_CURRENCY.ref.iconHash, TF2_CURRENCY.ref.short);

    const keyLabel = document.createElement("span");
    keyLabel.textContent = "(Key Value:";
    valueRow.appendChild(keyLabel);
    appendAmountIcon(valueRow, `${settings.keyPriceRef} refs`, TF2_CURRENCY.ref.iconHash, TF2_CURRENCY.ref.short);

    const earbudsLabel = document.createElement("span");
    earbudsLabel.textContent = "| Earbuds Value:";
    valueRow.appendChild(earbudsLabel);
    appendAmountIcon(valueRow, `${settings.earbudsPriceKeys} keys`, TF2_CURRENCY.keys.iconHash, TF2_CURRENCY.keys.short);

    const plus = document.createElement("span");
    plus.textContent = "+";
    valueRow.appendChild(plus);
    appendAmountIcon(valueRow, `${settings.earbudsPriceRef} refs`, TF2_CURRENCY.ref.iconHash, TF2_CURRENCY.ref.short);

    const endingPhrase = document.createElement("span");
    endingPhrase.textContent = ")"
    valueRow.appendChild(endingPhrase)

    panel.appendChild(valueRow);
  } else {
    const hint = document.createElement("span");
    hint.className = "tf2utils-inv-currency-hint";
    hint.textContent = "Total currency value can't be calculated — set both the key price and the Earbuds price in Settings.";
    panel.appendChild(hint);
  }
}

// Per-page-load state for the authoritative fetch — kept outside
// reload() so it's only ever attempted via an explicit forceFullFetch
// (the Refresh button). Automatic triggers (mutation observer, bridge
// updates, tab-switch) only ever re-render off inventoryFetchBridge's
// own data — they never touch Steam directly.
let fullFetchStatus = "idle"; // idle | pending | done | failed
let fullFetchCounts = null;
let fullFetchError = null;

async function reload(panel, { forceFullFetch = false } = {}) {
  renderLoading(panel);

  let quick, settings;
  try {
    [quick, settings] = await Promise.all([loadQuickCounts(), getSettings()]);
  } catch (err) {
    renderError(panel, err);
    return;
  }

  if (forceFullFetch) {
    fullFetchStatus = "idle";
    fullFetchError = null;
  }

  if (fullFetchStatus === "done") {
    renderPanel(panel, fullFetchCounts, settings, false, null, quick.totalCount, quick.totalCount);
  } else {
    renderPanel(panel, quick.counts, settings, quick.isPartial, fullFetchStatus === "failed" ? fullFetchError : null, quick.loadedCount, quick.totalCount);
  }

  if (!forceFullFetch) return; // only Steam's own data can confirm the count — only fetch it when explicitly asked to

  const steamId64 = getOwnerSteamId64();
  if (!steamId64) return; // can't fetch without it — quick estimate stays up

  fullFetchStatus = "pending";
  try {
    fullFetchCounts = countsFromNameCounts(await fetchFullNameCounts(steamId64, quick.totalCount));
    fullFetchStatus = "done";
    renderPanel(panel, fullFetchCounts, settings, false, null, quick.totalCount, quick.totalCount);
  } catch (err) {
    fullFetchStatus = "failed";
    fullFetchError = err;
    renderPanel(panel, quick.counts, settings, quick.isPartial, err, quick.loadedCount, quick.totalCount);
  }
}

function insertPanel(panel, anchor) {
  anchor.insertAdjacentElement("afterend", panel);
}

/** Finds the TF2 inventory grid container, regardless of the owner's steamid64. */
function findTf2Container() {
  return document.querySelector('[id^="inventory_"][id$="_440_2"]');
}

function isTf2Active() {
  // Steam sets the URL hash to the active appid when switching tabs.
  if (location.hash) return location.hash === "#440";
  // No hash yet on first load — fall back to the container's own visibility.
  const container = findTf2Container();
  return !!container && container.style.display !== "none";
}

/** Main export — call once per page load. */
export function showInventoryCurrencyCounter() {
  let loaded = false;

  async function tryLoad() {
    if (!isTf2Active()) {
      document.getElementById(PANEL_ID)?.remove();
      loaded = false;
      return;
    }
    if (loaded) return;

    const anchor = document.querySelector(".filter_ctn.inventory_filters") || findTf2Container()?.parentElement;
    if (!anchor) return; // not rendered yet — a later retry/observer tick will catch it

    loaded = true;

    injectStyles();
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      insertPanel(panel, anchor);
    }

    await reload(panel);
  }

  tryLoad();
  setTimeout(tryLoad, 600);
  setTimeout(tryLoad, 1500);
  setTimeout(tryLoad, 3000);

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(tryLoad, 300);
  }).observe(document.body, { childList: true, subtree: true });

  // Switching game tabs (e.g. TF2 -> Steam -> TF2) updates the URL
  // hash without a full page reload.
  window.addEventListener("hashchange", tryLoad);

  // inventoryFetchBridge dispatches this whenever it observes a new
  // page of the inventory (e.g. the user scrolling further) — since
  // counts come entirely from its map, re-render then too, so a
  // partial count silently completes itself instead of needing a
  // manual refresh click. Debounced the same way as the mutation
  // observer above, since a fast scroll can fire this repeatedly.
  let bridgeUpdateTimer = null;
  window.addEventListener("tf2utils_inv_updated", () => {
    if (!loaded) return;
    clearTimeout(bridgeUpdateTimer);
    bridgeUpdateTimer = setTimeout(() => {
      const panel = document.getElementById(PANEL_ID);
      if (panel) reload(panel);
    }, 300);
  });
}
