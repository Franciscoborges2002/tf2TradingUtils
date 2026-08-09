/**
 * @TF2TradingUtils - inventoryCurrencyCounter
 * On your own Steam inventory page, while viewing the TF2 (440) tab,
 * shows a running count of keys/metal (and a couple of notable items)
 * actually in your inventory — useful since backpack.tf's own
 * inventory cache can lag behind or fail to refresh.
 *
 * Reads straight from the same inventory endpoint the page itself
 * uses (steamcommunity.com/inventory/<steamid64>/440/2?...), rather
 * than scraping the rendered item grid. That's far more robust than
 * the earlier icon-hash-matching approach: items are matched by their
 * real market_hash_name (no per-item icon hash to hunt down), it
 * isn't limited to whatever's currently scrolled into view, and it
 * handles pagination for large inventories via start_assetid.
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

// backpack.tf's classic grid renders 16 items per page — the page
// controls' own page count (e.g. "1 of 83") times 16 gives a request
// size that's guaranteed to cover the whole inventory in one call,
// rather than guessing at a fixed max.
const ITEMS_PER_PAGE = 16;
const DEFAULT_REQUEST_COUNT = 2000; // fallback if page controls aren't found

function estimateInventorySize() {
  const maxPage = parseInt(document.getElementById("pagecontrol_max")?.textContent, 10);
  return maxPage > 0 ? maxPage * ITEMS_PER_PAGE : null;
}

/** Fetches the full TF2 inventory (paginated via start_assetid) and
 *  returns a Map of market_hash_name -> total amount owned. */
async function fetchInventoryNameCounts(steamId64) {
  const nameCounts = new Map();
  let startAssetId = null;
  const requestCount = estimateInventorySize() ?? DEFAULT_REQUEST_COUNT;

  for (;;) {
    const url = new URL(`https://steamcommunity.com/inventory/${steamId64}/${TF2_APPID}/${TF2_CONTEXTID}`);
    url.searchParams.set("l", "english");
    url.searchParams.set("count", String(requestCount));
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

    if (!data.more_items || !data.last_assetid) break;
    startAssetId = data.last_assetid;
  }

  return nameCounts;
}

/** Reads { keyPriceRef, earbudsPriceKeys, earbudsPriceRef } from the
 *  popup's Settings view (chrome.storage.local, shared across the
 *  whole extension — no messaging needed to reach it from here). */
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => resolve(result.settings ?? {}));
  });
}

async function loadCounts() {
  const steamId64 = getOwnerSteamId64();
  if (!steamId64) throw new Error("couldn't determine the inventory owner's steamid64");

  const nameCounts = await fetchInventoryNameCounts(steamId64);

  const counts = { keys: 0, ref: 0, rec: 0, scrap: 0 };
  for (const key of Object.keys(TRACKED_ITEMS)) counts[key] = 0;

  for (const [name, amount] of nameCounts) {
    const key = NAME_TO_KEY[name];
    if (key) counts[key] += amount;
  }

  return counts;
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

function renderPanel(panel, counts, settings) {
  panel.innerHTML = "";

  const header = document.createElement("div");
  header.className = "tf2utils-inv-currency-row";

  const title = document.createElement("span");
  title.className = "tf2utils-inv-currency-title";
  title.textContent = "Currency In this inventory:";
  header.appendChild(title);

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "tf2utils-inv-currency-refresh";
  refreshBtn.textContent = "↻ Refresh";
  refreshBtn.title = "Re-fetch straight from Steam (bypasses any stale cache)";
  refreshBtn.onclick = () => reload(panel);
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

async function reload(panel) {
  renderLoading(panel);
  try {
    const [counts, settings] = await Promise.all([loadCounts(), loadSettings()]);
    renderPanel(panel, counts, settings);
  } catch (err) {
    renderError(panel, err);
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
}
