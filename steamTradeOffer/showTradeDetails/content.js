/**
 * @TF2TradingUtils - showTradeDetails
 * Trade summary showing item images for both sides of a trade offer.
 *
 * Link: https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/showTradeDetails
 */

const PANEL_ID  = "tf2utils-denominations-panel";
const STYLES_ID = "tf2utils-denom-styles";

const CURRENCY = {
  "Mann Co. Supply Crate Key": { short: "Key",   scrap: null, icon: "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEMfvFAz-K1wRIaGRXY_GrPIGIFyBfPAhBtm4V0JYGb18_LbFgXMvb_fFjSJN-S4HmhFuJcLR-Y1M2Z4MCA" },
  "Refined Metal":             { short: "Ref",   scrap: 9  },
  "Reclaimed Metal":           { short: "Rec",   scrap: 3  },
  "Scrap Metal":               { short: "Scrap", scrap: 1  },
};

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────
export async function showTradeDetails() {
  const ready = await waitFor(
    () =>
      document.getElementById("your_slots") &&
      document.getElementById("their_slots"),
    200,
    10_000
  );

  if (!ready) {
    console.warn("[TF2TradingUtils] showTradeDetails: trade slots not found.");
    return;
  }

  if (document.getElementById(PANEL_ID)) return;

  injectStyles();
  const panel = buildPanel();
  insertPanel(panel);

  await refresh(panel);

  const observer = new MutationObserver(() => refresh(panel));
  const cfg = { childList: true, subtree: true };
  observer.observe(document.getElementById("your_slots"), cfg);
  observer.observe(document.getElementById("their_slots"), cfg);

  console.log("[TF2TradingUtils] showTradeDetails active.");
}

// ─────────────────────────────────────────────────────────────
// Panel insertion — before the comment/note section
// ─────────────────────────────────────────────────────────────
function insertPanel(panel) {
  const note = document.getElementById("tradeoffer_addmessage");

  if (note) {
    let el = note.parentElement;
    while (el && el.parentElement) {
      if (el.parentElement.children.length > 1) {
        el.insertAdjacentElement("beforebegin", panel);
        console.log("[TF2TradingUtils] inserted before:", el.id || el.className);
        return;
      }
      el = el.parentElement;
    }
  }

  for (const sel of [".trade_partner_info_block", "#trade_offer_create", ".tradeoffer_footer"]) {
    const el = document.querySelector(sel);
    if (el?.parentElement) {
      el.insertAdjacentElement("beforebegin", panel);
      return;
    }
  }

  const form = document.getElementById("tradeoffer_form");
  if (form) { form.appendChild(panel); return; }

  Object.assign(panel.style, { position:"fixed", bottom:"16px", right:"16px", zIndex:"9999", maxWidth:"440px" });
  document.body.appendChild(panel);
}

// ─────────────────────────────────────────────────────────────
// Data — CustomEvent bridge to pageContext/content.js (MAIN world)
// ─────────────────────────────────────────────────────────────
function fetchTradeItems() {
  return new Promise((resolve) => {
    const eventId = `tf2utils_denom_${Date.now()}`;
    const timeout = setTimeout(() => {
      console.warn("[TF2TradingUtils] fetchTradeItems timed out.");
      resolve({ me: [], them: [] });
    }, 2_000);
    window.addEventListener(eventId, (e) => {
      clearTimeout(timeout);
      resolve(e.detail);
    }, { once: true });
    window.dispatchEvent(new CustomEvent("tf2utils_request_trade_data", { detail: { eventId } }));
  });
}

// ─────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────
async function refresh(panel) {
  const data = await fetchTradeItems();
  renderPanel(panel, data);
}

function buildPanel() {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="tf2d-header">
      <span class="tf2d-title">📦 Trade Summary</span>
    </div>
    <div class="tf2d-body">
      <div class="tf2d-side" id="tf2d-me">
        <div class="tf2d-side-label">You offer <span class="tf2d-count-badge"></span></div>
        <div class="tf2d-grid"></div>
        <div class="tf2d-currency"></div>
      </div>
      <div class="tf2d-divider"></div>
      <div class="tf2d-side" id="tf2d-them">
        <div class="tf2d-side-label">They offer <span class="tf2d-count-badge"></span></div>
        <div class="tf2d-grid"></div>
        <div class="tf2d-currency"></div>
      </div>
    </div>
  `;
  return panel;
}

function renderPanel(panel, data) {
  renderSide(panel.querySelector("#tf2d-me"),   data.me   ?? []);
  renderSide(panel.querySelector("#tf2d-them"), data.them ?? []);
}

function renderSide(sideEl, items) {
  if (!sideEl) return;
  const badge      = sideEl.querySelector(".tf2d-count-badge");
  const gridEl     = sideEl.querySelector(".tf2d-grid");
  const currencyEl = sideEl.querySelector(".tf2d-currency");
  if (!gridEl) return;

  gridEl.innerHTML = "";
  if (currencyEl) currencyEl.innerHTML = "";

  if (!items.length) {
    if (badge) badge.textContent = "";
    gridEl.innerHTML = `<span class="tf2d-empty">Nothing</span>`;
    return;
  }

  if (badge) badge.textContent = `(${items.length} item${items.length !== 1 ? "s" : ""})`;

  // Group by name (preferred) or icon_url fallback so identical items stack
  const groups = new Map();
  for (const item of items) {
    const key = item.name || item.icon_url || "__unknown__";
    if (groups.has(key)) {
      groups.get(key).count++;
    } else {
      groups.set(key, { name: item.name, name_color: item.name_color, icon_url: item.icon_url, count: 1 });
    }
  }

  for (const { name, name_color, icon_url, count } of groups.values()) {
    const card = document.createElement("div");
    card.className = "tf2d-card";
    if (name) card.title = name + (count > 1 ? ` ×${count}` : "");

    const wrap = document.createElement("div");
    wrap.className = "tf2d-img-wrap";

    if (icon_url) {
      const img = document.createElement("img");
      img.src       = icon_url;
      img.className = "tf2d-img";
      img.loading   = "lazy";
      img.onerror   = () => img.replaceWith(makePlaceholder());
      wrap.appendChild(img);
    } else {
      wrap.appendChild(makePlaceholder());
    }

    if (count > 1) {
      const qty = document.createElement("span");
      qty.className   = "tf2d-qty-badge";
      qty.textContent = `×${count}`;
      wrap.appendChild(qty);
    }

    card.appendChild(wrap);

    if (name) {
      const nameEl = document.createElement("span");
      nameEl.className   = "tf2d-card-name";
      nameEl.textContent = name;
      if (name_color) nameEl.style.color = `#${name_color}`;
      card.appendChild(nameEl);
    }

    gridEl.appendChild(card);
  }

  if (currencyEl) renderCurrency(currencyEl, items);
}

// ─────────────────────────────────────────────────────────────
// Currency summary bar — keys + metal breakdown
// Two styles: detailed (chips) and compact (decimal refs)
// ─────────────────────────────────────────────────────────────

let g_currencyStyle = "detailed"; // "detailed" | "compact"

function renderCurrency(el, items) {
  el.innerHTML = "";

  let keys  = 0;
  let scrap = 0;

  for (const item of items) {
    const cur = CURRENCY[item.name];
    if (!cur) continue;
    if (cur.scrap === null) keys++;
    else scrap += cur.scrap;
  }

  if (!keys && !scrap) return;

  const row = document.createElement("div");
  row.className = "tf2d-currency-row";

  // ── Content ──
  const content = document.createElement("div");
  content.className = "tf2d-currency-content";
  renderCurrencyContent(content, keys, scrap);
  row.appendChild(content);

  // ── Toggle button ──
  const toggle = document.createElement("button");
  toggle.className   = "tf2d-currency-toggle";
  toggle.textContent = g_currencyStyle === "detailed" ? "compact" : "detailed";
  toggle.title       = "Switch display style";
  toggle.onclick     = () => {
    g_currencyStyle   = g_currencyStyle === "detailed" ? "compact" : "detailed";
    toggle.textContent = g_currencyStyle === "detailed" ? "compact" : "detailed";
    renderCurrencyContent(content, keys, scrap);
  };
  row.appendChild(toggle);

  el.appendChild(row);
}

function renderCurrencyContent(el, keys, scrap) {
  el.innerHTML = "";
  if (g_currencyStyle === "compact") {
    renderCompact(el, keys, scrap);
  } else {
    renderDetailed(el, keys, scrap);
  }
}

// "2 Keys · 5.44 ref"
function renderCompact(el, keys, scrap) {
  const parts = [];

  if (keys) {
    parts.push({ label: `${keys} Key${keys > 1 ? "s" : ""}`, color: "#B35112" });
  }

  if (scrap) {
    // Convert to decimal ref: remainder/9 gives the fractional part
    // TF2 convention: 1 scrap = .11, 1 rec = .33, 2 rec = .66, etc.
    const ref     = Math.floor(scrap / 9);
    const rem     = scrap % 9;
    // Express remainder as hundredths: e.g. 4 scrap = 44, 3 scrap = 33
    const decimal = String(Math.round((rem / 9) * 100)).padStart(2, "0");
    parts.push({ label: `${ref}.${decimal} ref`, color: "#c0c0c0" });
  }

  parts.forEach((p, i) => {
    const chip = document.createElement("span");
    chip.className   = "tf2d-currency-chip";
    chip.textContent = p.label;
    chip.style.color = p.color;
    el.appendChild(chip);

    if (i < parts.length - 1) {
      const sep = document.createElement("span");
      sep.className   = "tf2d-currency-sep";
      sep.textContent = "·";
      el.appendChild(sep);
    }
  });
}

// "2 Keys + 5 Ref + 1 Rec + 1 Scrap"
function renderDetailed(el, keys, scrap) {
  const ref    = Math.floor(scrap / 9);
  const rem    = scrap % 9;
  const rec    = Math.floor(rem / 3);
  const scraps = rem % 3;

  const parts = [];
  if (keys)   parts.push({ label: `${keys} Key${keys > 1 ? "s" : ""}`, color: "#B35112" });
  if (ref)    parts.push({ label: `${ref} Ref`,                          color: "#c0c0c0" });
  if (rec)    parts.push({ label: `${rec} Rec`,                          color: "#c0c0c0" });
  if (scraps) parts.push({ label: `${scraps} Scrap`,                     color: "#c0c0c0" });

  parts.forEach((p, i) => {
    const chip = document.createElement("span");
    chip.className   = "tf2d-currency-chip";
    chip.textContent = p.label;
    chip.style.color = p.color;
    el.appendChild(chip);

    if (i < parts.length - 1) {
      const sep = document.createElement("span");
      sep.className   = "tf2d-currency-sep";
      sep.textContent = "+";
      el.appendChild(sep);
    }
  });
}

function makePlaceholder() {
  const ph = document.createElement("div");
  ph.className = "tf2d-img-ph";
  ph.textContent = "?";
  return ph;
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
      margin: 8px 0;
      border-radius: 6px;
      background: #201C1A;
      border: 1px solid rgba(255,255,255,0.1);
      font: 12px / 1.4 "Motiva Sans", system-ui, Segoe UI, Roboto, sans-serif;
      color: #ffffff;
      overflow: hidden;
      user-select: none;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    .tf2d-header {
      background: rgba(255,255,255,0.06);
      padding: 7px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .tf2d-title {
      font-weight: 700;
      font-size: 12px;
      color: #ffffff;
      letter-spacing: 0.03em;
    }

    .tf2d-body {
      display: flex !important;
      align-items: flex-start;
    }
    .tf2d-divider {
      width: 1px;
      align-self: stretch;
      background: rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .tf2d-side {
      flex: 1;
      padding: 8px 10px;
      min-width: 0;
    }
    #tf2d-me   { border-left: 3px solid #9D312F; }
    #tf2d-them { border-left: 3px solid #395C78; }

    .tf2d-side-label {
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 8px;
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    #tf2d-me   .tf2d-side-label { color: #9D312F; }
    #tf2d-them .tf2d-side-label { color: #395C78; }

    .tf2d-count-badge {
      font-weight: 400;
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      text-transform: none;
      letter-spacing: 0;
    }

    .tf2d-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      max-height: 260px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    .tf2d-grid::-webkit-scrollbar       { width: 3px; }
    .tf2d-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .tf2d-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 52px;
      cursor: default;
    }

    .tf2d-card-name {
      font-size: 9px;
      color: rgba(255,255,255,0.55);
      text-align: center;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .tf2d-img-wrap {
      position: relative;
      width: 48px;
      height: 48px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      transition: border-color 0.12s;
    }
    .tf2d-img-wrap:hover {
      border-color: #B35112;
    }

    .tf2d-img {
      width: 44px;
      height: 44px;
      image-rendering: pixelated;
      display: block;
      object-fit: contain;
    }

    .tf2d-qty-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      background: rgba(0,0,0,0.8);
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 3px;
      border-radius: 3px;
      line-height: 1.3;
      pointer-events: none;
    }

    .tf2d-img-ph {
      font-size: 14px;
      color: rgba(255,255,255,0.3);
      text-align: center;
    }

    .tf2d-empty {
      color: rgba(255,255,255,0.3);
      font-style: italic;
      font-size: 11px;
    }

    .tf2d-currency {
      margin-top: 6px;
      min-height: 4px;
    }
    .tf2d-currency-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 4px;
      padding: 5px 6px;
      background: rgba(255,255,255,0.04);
      border-top: 1px solid rgba(255,255,255,0.07);
      border-radius: 0 0 4px 4px;
    }
    .tf2d-currency-content {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
    .tf2d-currency-chip {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .tf2d-currency-sep {
      font-size: 10px;
      color: rgba(255,255,255,0.25);
    }
    .tf2d-currency-toggle {
      background: none;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 3px;
      color: rgba(255,255,255,0.3);
      font-size: 9px;
      padding: 1px 5px;
      cursor: pointer;
      line-height: 1.4;
      flex-shrink: 0;
    }
    .tf2d-currency-toggle:hover {
      border-color: #B35112;
      color: #B35112;
    }
  `;
  document.head.appendChild(style);
}