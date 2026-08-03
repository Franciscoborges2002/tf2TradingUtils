/**
 * @TF2TradingUtils - tradeOfferPanel
 * Panel of trade offer utilities, injected directly above the trade
 * summary panel (showTradeDetails).
 * Currently: quickly add keys and metal to the trade, from either your own
 * or the trade partner's inventory. Two modes: detailed (per-denomination
 * inputs) and compact (e.g. "5 keys 5.44 ref").
 *
 * Link: https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/tradeOfferPanel
 */

import { COLOR_ACCENT, COLOR_DANGER, COLOR_METAL, COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { TF2_CURRENCY, TF2_CURRENCY_BY_NAME } from "../../utils/constants/tf2Economy.js";

const PANEL_ID  = "tf2utils-addcurrency-panel";
const STYLES_ID = "tf2utils-addcurrency-styles";

// showTradeDetails' panel id — kept in sync manually, used to insert
// this panel directly above the trade summary.
const SUMMARY_PANEL_ID = "tf2utils-denominations-panel";

const DENOMS = ["keys", "ref", "rec", "scrap"].map((key) => ({
  key,
  label: TF2_CURRENCY[key].short,
  color: key === "keys" ? COLOR_ACCENT : COLOR_METAL,
}));

// Full Steam item name → short label, e.g. "Refined Metal" → "Ref"
const SHORT_TO_NAME = Object.fromEntries(
  Object.entries(TF2_CURRENCY_BY_NAME).map(([name, c]) => [name, c.short])
);

let g_mode       = "detailed"; // "detailed" | "compact"
let g_activeSide = "me";       // "me" | "them" — whose inventory tab is selected

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────
export async function addCurrency() {
  const ready = await waitFor(
    () => !!document.getElementById("your_slots"),
    200, 10_000
  );

  if (!ready) {
    console.warn("[TF2TradingUtils] addCurrency: trade slots not found.");
    return;
  }

  if (document.getElementById(PANEL_ID)) return;

  injectStyles();
  const panel = buildPanel();
  await insertPanel(panel);
  await refreshAvailable(panel);

  // Re-check available when either side's trade slots change
  const observer = new MutationObserver(() => refreshAvailable(panel));
  observer.observe(document.getElementById("your_slots"), { childList: true, subtree: true });
  const theirSlots = document.getElementById("their_slots");
  if (theirSlots) observer.observe(theirSlots, { childList: true, subtree: true });

  // pageContext signals when an inventory map finishes building — refresh counts then
  window.addEventListener("tf2utils_my_inventory_ready",    () => refreshAvailable(panel), { once: true });
  window.addEventListener("tf2utils_their_inventory_ready", () => refreshAvailable(panel), { once: true });

  // Listen for "missing items" events fired from pageContext
  window.addEventListener("tf2utils_currency_missing", (e) => {
    showMissingPopup(panel, e.detail);
  });

  // Switch between "my inventory" and "their inventory" currency when the
  // user changes the Steam inventory tab. Bound directly to the known tab
  // elements (rather than delegated on document) so it still fires even
  // if Steam's own tab handler calls stopPropagation().
  bindInventoryTabSwitch(panel);

  console.log("[TF2TradingUtils] addCurrency active.");
}

// ─────────────────────────────────────────────────────────────
// Insertion — directly above the trade summary panel
// (showTradeDetails' "tf2utils-denominations-panel"), so both
// panels sit together. Falls back to the inventory controls area
// if the summary panel never shows up (e.g. showTradeDetails failed
// to load, or trade slots weren't found).
// ─────────────────────────────────────────────────────────────
async function insertPanel(panel) {
  await waitFor(() => !!document.getElementById(SUMMARY_PANEL_ID), 150, 5_000);

  const summaryPanel = document.getElementById(SUMMARY_PANEL_ID);
  if (summaryPanel) {
    summaryPanel.insertAdjacentElement("beforebegin", panel);
    return;
  }

  const targets = [
    document.getElementById("filter_control_holder"),
    document.querySelector(".trade_search_box"),
    document.getElementById("inventory_displaycontrols"),
    document.querySelector(".inventory_user_tab")?.closest("div"),
  ];

  for (const el of targets) {
    if (el?.parentElement) {
      el.insertAdjacentElement("beforebegin", panel);
      return;
    }
  }

  const form = document.getElementById("tradeoffer_form");
  if (form) { form.prepend(panel); return; }
  document.body.appendChild(panel);
}

// ─────────────────────────────────────────────────────────────
// PageContext bridge helpers
// ─────────────────────────────────────────────────────────────
function getAvailableCurrency() {
  return new Promise((resolve) => {
    const eventId      = `tf2utils_currency_${Date.now()}`;
    const requestEvent = g_activeSide === "me" ? "tf2utils_get_my_currency" : "tf2utils_get_their_currency";
    const timeout = setTimeout(() => resolve({ keys: 0, ref: 0, rec: 0, scrap: 0 }), 5_000);
    window.addEventListener(eventId, (e) => { clearTimeout(timeout); resolve(e.detail); }, { once: true });
    window.dispatchEvent(new CustomEvent(requestEvent, { detail: { eventId } }));
  });
}

function dispatchAddCurrency(amounts) {
  const addEvent = g_activeSide === "me" ? "tf2utils_add_currency" : "tf2utils_add_their_currency";
  window.dispatchEvent(new CustomEvent(addEvent, { detail: amounts }));
}

// ─────────────────────────────────────────────────────────────
// Refresh available counts — update labels + input maxes
// ─────────────────────────────────────────────────────────────
async function refreshAvailable(panel) {
  const counts = await getAvailableCurrency();

  for (const { key } of DENOMS) {
    const avail = panel.querySelector(`[data-avail="${key}"]`);
    const input = panel.querySelector(`[data-input="${key}"]`);
    const count = counts[key] ?? 0;

    if (avail) avail.textContent = count;
    if (input) {
      input.max = count;
      input.disabled = count === 0;
      if (parseInt(input.value) > count) input.value = count;
    }
  }
}

function updateSideLabel(panel) {
  const badge = panel.querySelector(".ac-side-badge");
  if (badge) badge.textContent = g_activeSide === "me" ? "Yours" : "Theirs";
}

function bindInventoryTabSwitch(panel) {
  const yourTab  = document.getElementById("inventory_select_your_inventory");
  const theirTab = document.getElementById("inventory_select_their_inventory");

  const switchTo = (side) => {
    if (side === g_activeSide) return;
    g_activeSide = side;
    updateSideLabel(panel);
    refreshAvailable(panel);
  };

  yourTab?.addEventListener("click", () => switchTo("me"));
  theirTab?.addEventListener("click", () => switchTo("them"));

  if (!yourTab || !theirTab) {
    console.warn("[TF2TradingUtils] addCurrency: inventory tab element(s) not found — side switching disabled.");
  }
}

// ─────────────────────────────────────────────────────────────
// Panel build
// ─────────────────────────────────────────────────────────────
function buildPanel() {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;

  // Header
  const header = document.createElement("div");
  header.className = "ac-header";

  const title = document.createElement("span");
  title.className   = "ac-title";
  title.textContent = "💰 Add Currency";
  header.appendChild(title);

  const sideBadge = document.createElement("span");
  sideBadge.className   = "ac-side-badge";
  sideBadge.textContent = "Yours";
  header.appendChild(sideBadge);

  const modeToggle = document.createElement("button");
  modeToggle.className   = "ac-mode-toggle";
  modeToggle.textContent = "compact";
  modeToggle.onclick     = () => {
    g_mode = g_mode === "detailed" ? "compact" : "detailed";
    modeToggle.textContent = g_mode === "detailed" ? "compact" : "detailed";
    detailedBody.style.display = g_mode === "detailed" ? "" : "none";
    compactBody.style.display  = g_mode === "compact"  ? "" : "none";
  };
  header.appendChild(modeToggle);

  const clearSideBtn = document.createElement("button");
  clearSideBtn.className   = "ac-clear-side-btn";
  clearSideBtn.textContent = "🗑";
  clearSideBtn.title       = "Remove all items from this side of the trade";
  clearSideBtn.onclick     = () => {
    const label = g_activeSide === "me" ? "your" : "their";
    if (!window.confirm(`Remove all items from ${label} side of the trade?`)) return;
    window.dispatchEvent(new CustomEvent("tf2utils_clear_side", { detail: { side: g_activeSide } }));
    setTimeout(() => refreshAvailable(panel), 600);
  };
  header.appendChild(clearSideBtn);

  panel.appendChild(header);

  // ── Detailed body ──────────────────────────────────────────
  const detailedBody = document.createElement("div");
  detailedBody.className   = "ac-body";
  detailedBody.style.display = "";

  for (const { key, label, color } of DENOMS) {
    const row = document.createElement("div");
    row.className = "ac-row";

    const labelEl = document.createElement("span");
    labelEl.className   = "ac-label";
    labelEl.textContent = label;
    labelEl.style.color = color;
    row.appendChild(labelEl);

    const avail = document.createElement("span");
    avail.className     = "ac-avail";
    avail.dataset.avail = key;
    avail.textContent   = "…";
    row.appendChild(avail);

    const input = document.createElement("input");
    input.type          = "number";
    input.min           = "0";
    input.max           = "0";
    input.value         = "0";
    input.className     = "ac-input";
    input.dataset.input = key;
    input.disabled      = true;
    input.addEventListener("input", () => {
      const max = parseInt(input.max) || 0;
      const val = parseInt(input.value) || 0;
      if (val > max) input.value = max;
      if (val < 0)   input.value = 0;
    });
    row.appendChild(input);

    const btnPlus = document.createElement("button");
    btnPlus.className   = "ac-btn";
    btnPlus.textContent = "+1";
    btnPlus.onclick = () => {
      const max = parseInt(input.max) || 0;
      const val = parseInt(input.value) || 0;
      if (val < max) input.value = val + 1;
    };
    row.appendChild(btnPlus);

    const btnMax = document.createElement("button");
    btnMax.className   = "ac-btn ac-btn--dim";
    btnMax.textContent = "max";
    btnMax.onclick = () => { input.value = input.max; };
    row.appendChild(btnMax);

    detailedBody.appendChild(row);
  }

  // Detailed footer
  const detailedFooter = document.createElement("div");
  detailedFooter.className = "ac-footer";
  detailedFooter.appendChild(makeAddButton(() => {
    const amounts = {};
    for (const { key } of DENOMS) {
      amounts[key] = parseInt(panel.querySelector(`[data-input="${key}"]`)?.value) || 0;
    }
    dispatchAddCurrency(amounts);
    for (const { key } of DENOMS) {
      const inp = panel.querySelector(`[data-input="${key}"]`);
      if (inp) inp.value = 0;
    }
    setTimeout(() => refreshAvailable(panel), 600);
  }));
  detailedFooter.appendChild(makeClearButton(() => {
    for (const { key } of DENOMS) {
      const inp = panel.querySelector(`[data-input="${key}"]`);
      if (inp) inp.value = 0;
    }
  }));
  detailedBody.appendChild(detailedFooter);
  panel.appendChild(detailedBody);

  // ── Compact body ───────────────────────────────────────────
  const compactBody = document.createElement("div");
  compactBody.className    = "ac-body";
  compactBody.style.display = "none";

  const hint = document.createElement("div");
  hint.className   = "ac-hint";
  hint.textContent = 'e.g. "5 keys 5.44 ref" or "3 keys" or "2.33 ref"';
  compactBody.appendChild(hint);

  const compactInput = document.createElement("input");
  compactInput.type        = "text";
  compactInput.className   = "ac-compact-input";
  compactInput.placeholder = "5 keys 5.44 ref";
  compactInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doCompactAdd();
  });
  compactBody.appendChild(compactInput);

  const compactFooter = document.createElement("div");
  compactFooter.className = "ac-footer";
  compactFooter.appendChild(makeAddButton(() => doCompactAdd()));
  compactFooter.appendChild(makeClearButton(() => { compactInput.value = ""; }));
  compactBody.appendChild(compactFooter);
  panel.appendChild(compactBody);

  function doCompactAdd() {
    const parsed = parseCompactInput(compactInput.value);
    if (!parsed) return;
    dispatchAddCurrency(parsed);
    compactInput.value = "";
    setTimeout(() => refreshAvailable(panel), 600);
  }

  return panel;
}

// ─────────────────────────────────────────────────────────────
// Parse compact input string → { keys, ref, rec, scrap }
// Supports: "5 keys 5.44 ref", "3 keys", "2.33 ref", "5.44"
// ─────────────────────────────────────────────────────────────
function parseCompactInput(str) {
  if (!str.trim()) return null;

  const result = { keys: 0, ref: 0, rec: 0, scrap: 0 };

  // Keys: "N key(s)"
  const keysMatch = str.match(/(\d+)\s*keys?/i);
  if (keysMatch) result.keys = parseInt(keysMatch[1]);

  // Metal: "N.NN ref/metal/refined" or just "N.NN"
  const metalMatch = str.match(/([\d]+(?:\.[\d]+)?)\s*(?:ref(?:ined)?|metal)?(?:\s|$)/i);
  if (metalMatch) {
    const decimal = parseFloat(metalMatch[1]);
    const totalScrap = Math.round(decimal * 9);
    result.ref   = Math.floor(totalScrap / 9);
    const rem    = totalScrap % 9;
    result.rec   = Math.floor(rem / 3);
    result.scrap = rem % 3;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// Insufficient items popup
// ─────────────────────────────────────────────────────────────
function showMissingPopup(panel, missing) {
  // Remove any existing popup
  panel.querySelector(".ac-popup")?.remove();

  const popup = document.createElement("div");
  popup.className = "ac-popup";

  const closeBtn = document.createElement("button");
  closeBtn.className   = "ac-popup-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick     = () => popup.remove();
  popup.appendChild(closeBtn);

  const title = document.createElement("div");
  title.className   = "ac-popup-title";
  title.textContent = "⚠ Not enough items";
  popup.appendChild(title);

  for (const { name, requested, found } of missing) {
    const line = document.createElement("div");
    line.className   = "ac-popup-line";
    line.textContent = `${SHORT_TO_NAME[name] ?? name}: need ${requested}, have ${found}`;
    popup.appendChild(line);
  }

  panel.appendChild(popup);
}

// ─────────────────────────────────────────────────────────────
// Reusable button factories
// ─────────────────────────────────────────────────────────────
function makeAddButton(onClick) {
  const btn = document.createElement("button");
  btn.className   = "ac-add-btn";
  btn.textContent = "Add to Trade";
  btn.onclick     = onClick;
  return btn;
}

function makeClearButton(onClick) {
  const btn = document.createElement("button");
  btn.className   = "ac-clear-btn";
  btn.textContent = "Clear";
  btn.onclick     = onClick;
  return btn;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function waitFor(condition, interval = 200, timeout = 10_000) {
  return new Promise((resolve) => {
    if (condition()) { resolve(true); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      if (condition())                        { clearInterval(timer); resolve(true);  }
      else if (Date.now() - start > timeout)  { clearInterval(timer); resolve(false); }
    }, interval);
  });
}

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    #${PANEL_ID} {
      position: relative;
      clear: both;
      width: 100%;
      box-sizing: border-box;
      margin: 6px 0;
      border-radius: 6px;
      background: ${COLOR_PANEL_BG};
      border: 1px solid rgba(255,255,255,0.1);
      font: 12px / 1.4 "Motiva Sans", system-ui, Segoe UI, Roboto, sans-serif;
      color: #ffffff;
      overflow: visible;
      user-select: none;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Header */
    .ac-header {
      background: rgba(255,255,255,0.06);
      padding: 6px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ac-title {
      font-weight: 700;
      font-size: 12px;
      color: #fff;
      letter-spacing: 0.03em;
    }
    .ac-side-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: ${COLOR_ACCENT};
      background: rgba(179,81,18,0.15);
      border: 1px solid rgba(179,81,18,0.4);
      border-radius: 3px;
      padding: 1px 6px;
    }
    .ac-mode-toggle {
      margin-left: auto;
      background: none;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 3px;
      color: rgba(255,255,255,0.35);
      font-size: 9px;
      padding: 1px 6px;
      cursor: pointer;
    }
    .ac-mode-toggle:hover { border-color: ${COLOR_ACCENT}; color: ${COLOR_ACCENT}; }

    .ac-clear-side-btn {
      background: none;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 3px;
      color: rgba(255,255,255,0.35);
      font-size: 11px;
      line-height: 1.4;
      padding: 1px 6px;
      cursor: pointer;
    }
    .ac-clear-side-btn:hover { border-color: ${COLOR_DANGER}; color: ${COLOR_DANGER}; }

    /* Body */
    .ac-body {
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Detailed rows */
    .ac-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ac-label {
      font-weight: 700;
      font-size: 11px;
      width: 36px;
      flex-shrink: 0;
    }
    .ac-avail {
      font-size: 10px;
      color: rgba(255,255,255,0.35);
      width: 28px;
      text-align: right;
      flex-shrink: 0;
    }
    .ac-avail::before { content: "("; }
    .ac-avail::after  { content: ")"; }
    .ac-input {
      width: 44px;
      padding: 2px 4px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 3px;
      color: #fff;
      font-size: 11px;
      text-align: center;
      outline: none;
      -moz-appearance: textfield;
    }
    .ac-input::-webkit-inner-spin-button,
    .ac-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .ac-input:focus   { border-color: ${COLOR_ACCENT}; }
    .ac-input:disabled { opacity: 0.3; cursor: not-allowed; }
    .ac-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 3px;
      color: rgba(255,255,255,0.6);
      font-size: 10px;
      padding: 2px 5px;
      cursor: pointer;
    }
    .ac-btn:hover  { border-color: ${COLOR_ACCENT}; color: ${COLOR_ACCENT}; }
    .ac-btn--dim   { color: rgba(255,255,255,0.3); }

    /* Compact mode */
    .ac-hint {
      font-size: 10px;
      color: rgba(255,255,255,0.25);
      margin-bottom: 2px;
    }
    .ac-compact-input {
      width: 100%;
      box-sizing: border-box;
      padding: 5px 8px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      outline: none;
    }
    .ac-compact-input:focus { border-color: ${COLOR_ACCENT}; }

    /* Footer */
    .ac-footer {
      display: flex;
      gap: 6px;
      padding: 6px 8px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
    .ac-add-btn {
      flex: 1;
      padding: 5px 0;
      background: ${COLOR_ACCENT};
      border: none;
      border-radius: 4px;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      letter-spacing: 0.03em;
    }
    .ac-add-btn:hover { background: #c95d18; }
    .ac-clear-btn {
      padding: 5px 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      cursor: pointer;
    }
    .ac-clear-btn:hover { border-color: ${COLOR_DANGER}; color: ${COLOR_DANGER}; }

    /* Missing items popup */
    .ac-popup {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: ${COLOR_PANEL_BG};
      border: 1px solid ${COLOR_DANGER};
      border-radius: 6px;
      padding: 10px 12px;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .ac-popup-close {
      position: absolute;
      top: 6px;
      right: 8px;
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      font-size: 12px;
      cursor: pointer;
      padding: 0 2px;
      line-height: 1;
    }
    .ac-popup-close:hover { color: ${COLOR_DANGER}; }
    .ac-popup-title {
      font-weight: 700;
      font-size: 12px;
      color: ${COLOR_DANGER};
      margin-bottom: 6px;
      padding-right: 16px;
    }
    .ac-popup-line {
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      padding: 2px 0;
    }
  `;
  document.head.appendChild(style);
}