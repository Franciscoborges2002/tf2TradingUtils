/**
 * @TF2TradingUtils - tradeOfferCurrency
 * On the trade offers inbox (/tradeoffers/), sent (/tradeoffers/sent/) and
 * trade history (/tradehistory/) pages, shows a small two-column box —
 * one column per side of the trade, each with its own currency total
 * (e.g. "1 key, 3.78 ref"), so it's clear at a glance which side you're
 * giving vs. receiving instead of one ambiguous combined number. A side
 * with no currency shows its item count (e.g. "1 item") instead.
 *
 * Two different DOM shapes to handle, matching groupTradeItems' own
 * split for the same reason:
 *  - /tradeoffers/(sent/): box inserted right after .tradeoffer_header.
 *    Items carry no name/description text at all — just
 *    `data-economy-item="classinfo/440/<classid>/<instanceid>"` and an
 *    icon — so currency is matched by that classid (icon hash as a
 *    fallback) against TF2_CURRENCY. classid is a Steam *economy* id,
 *    distinct from TF2's own schema defindex, confirmed per-entry
 *    against real classinfo data (see tf2Economy.js's own doc comment).
 *    Each column is labeled with that side's own .tradeoffer_items_header
 *    text (e.g. "Hat Crafter offered" / "For your") rather than a
 *    hardcoded "You"/"Them", since primary/secondary isn't necessarily
 *    in the same order on /sent/ as it is on the inbox.
 *  - /tradehistory/: box inserted right after .tradehistory_event_description.
 *    Items *do* carry a name (.history_item_name), so currency is
 *    matched by name via TF2_CURRENCY_BY_NAME instead — simpler, no
 *    classid needed. Each side's own "+"/"–" (.tradehistory_items_plusminus)
 *    is unambiguous here, so those columns are labeled "Received"/"Given"
 *    directly.
 *
 * Quantity, on both shapes, is read from groupTradeItems' own "×N" badge
 * when present (that script also runs on these pages and collapses
 * duplicate items down to one element + badge) but falls back to
 * counting raw duplicate elements as 1 each otherwise — correct either
 * way regardless of whether that script has already run, since dynamic-
 * import execution order between the two isn't guaranteed.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/tradeOfferCurrency
 */

import { COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { TF2_CURRENCY, TF2_CURRENCY_BY_CLASSID, TF2_CURRENCY_BY_NAME } from "../../utils/constants/tf2Economy.js";

const STYLES_ID = "tf2utils-tradeoffer-currency-styles";
const PROCESSED_ATTR = "data-tf2utils-currency-total";
const BOX_CLASS = "tf2utils-currency-total";

// ─────────────────────────────────────────────────────────────
// Shared: "1 key, 3.78 ref" / "3 items" formatting + box rendering
// ─────────────────────────────────────────────────────────────

/** Just the total value, not a per-denomination breakdown. Null if there's no currency at all. */
function formatTotal({ keys, scrap }) {
  if (!keys && !scrap) return null;

  const parts = [];
  if (keys) parts.push(`${keys} key${keys !== 1 ? "s" : ""}`);
  if (scrap) {
    // Decimal ref: remainder/9 gives the fractional part (TF2 convention
    // — 1 scrap = .11, 1 rec = .33, 2 rec = .66, etc.)
    const ref     = Math.floor(scrap / 9);
    const rem     = scrap % 9;
    const decimal = String(Math.round((rem / 9) * 100)).padStart(2, "0");
    parts.push(`${ref}.${decimal} ref`);
  }
  return parts.join(", ");
}

/**
 * Renders the two-(or more-)column box from already-computed sides, or
 * null if none of them have any currency — a trade with no currency
 * anywhere isn't what this box is for.
 * @param {{label: string, keys: number, scrap: number, itemCount: number}[]} sides
 */
function renderTotalBox(sides) {
  const totals = sides.map((s) => ({ ...s, total: formatTotal(s) }));
  if (!totals.some((s) => s.total)) return null;

  const box = document.createElement("div");
  box.className = BOX_CLASS;

  totals.forEach((side, i) => {
    if (i > 0) {
      const divider = document.createElement("div");
      divider.className = "tf2utils-currency-total-divider";
      box.appendChild(divider);
    }

    const col = document.createElement("div");
    col.className = "tf2utils-currency-total-side";

    const label = document.createElement("span");
    label.className = "tf2utils-currency-total-label";
    label.textContent = side.label;
    col.appendChild(label);

    const value = document.createElement("span");
    value.className = "tf2utils-currency-total-value";
    // No currency on this side — show how many items it has instead of
    // a dead placeholder, still useful context next to the other total.
    value.textContent = side.total ?? `${side.itemCount} item${side.itemCount !== 1 ? "s" : ""}`;
    col.appendChild(value);

    box.appendChild(col);
  });

  return box;
}

// ─────────────────────────────────────────────────────────────
// /tradeoffers/(sent/) — classid-based matching
// ─────────────────────────────────────────────────────────────

/** Matches a .trade_item element against TF2_CURRENCY — classid first (confirmed for all 4 currency items), icon hash as a fallback. */
function matchOfferCurrency(tradeItemEl) {
  const economyItem = tradeItemEl.getAttribute("data-economy-item") || "";
  const classid = economyItem.match(/^classinfo\/\d+\/(\d+)\//)?.[1];
  if (classid && TF2_CURRENCY_BY_CLASSID[classid]) return TF2_CURRENCY_BY_CLASSID[classid];

  const src = tradeItemEl.querySelector("img")?.getAttribute("src") || "";
  return Object.values(TF2_CURRENCY).find((c) => src.includes(c.iconHash)) ?? null;
}

/** Reads groupTradeItems' "×N" badge if present, else this element counts as a single item. */
function getBadgeQty(el, badgeSelector) {
  const badge = el.querySelector(badgeSelector);
  if (!badge) return 1;
  const n = parseInt(badge.textContent.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** This side's own header text (e.g. "Hat Crafter offered:" -> "Hat Crafter offered"), for the column label. */
function offerSideLabel(itemsBlockEl) {
  const header = itemsBlockEl.querySelector(":scope > .tradeoffer_items_header");
  return header?.textContent.trim().replace(/:$/, "") || "Items";
}

function sumOfferSide(itemsBlockEl) {
  let keys = 0;
  let scrap = 0;
  let itemCount = 0;

  for (const item of itemsBlockEl.querySelectorAll(":scope > .tradeoffer_item_list > .trade_item")) {
    const qty = getBadgeQty(item, ".tf2utils-trade-item-qty");
    itemCount += qty;

    const currency = matchOfferCurrency(item);
    if (!currency) continue;
    if (currency.scrapValue === null) keys += qty;
    else scrap += currency.scrapValue * qty;
  }

  return { label: offerSideLabel(itemsBlockEl), keys, scrap, itemCount };
}

/** Processes one .tradeoffer — inserts its total box right after the header. */
function processTradeoffer(tradeEl) {
  if (tradeEl.hasAttribute(PROCESSED_ATTR)) return;
  tradeEl.setAttribute(PROCESSED_ATTR, "1");

  const header = tradeEl.querySelector(":scope > .tradeoffer_header");
  if (!header) return;

  const sideBlocks = [...tradeEl.querySelectorAll(":scope > .tradeoffer_items_ctn > .tradeoffer_items")];
  if (sideBlocks.length < 2) return; // unexpected shape — bail rather than guess

  const box = renderTotalBox(sideBlocks.map(sumOfferSide));
  if (box) header.insertAdjacentElement("afterend", box);
}

// ─────────────────────────────────────────────────────────────
// /tradehistory/ — name-based matching
// ─────────────────────────────────────────────────────────────

/** A .history_item's clean name (badge text stripped out) and quantity (from groupTradeItems' "×N" badge, if any). */
function getHistoryItemInfo(itemEl) {
  const nameEl = itemEl.querySelector(".history_item_name");
  if (!nameEl) return null;

  const qty = getBadgeQty(nameEl, ".tf2utils-history-item-qty");

  const clone = nameEl.cloneNode(true);
  clone.querySelector(".tf2utils-history-item-qty")?.remove();
  const name = clone.textContent.trim();

  return name ? { name, qty } : null;
}

/** "+"/"–" (Steam's own plusminus marker) translated to a plain label — unambiguous here, unlike the offer page's primary/secondary. */
function historySideLabel(itemsBlockEl) {
  const symbol = itemsBlockEl.querySelector(":scope > .tradehistory_items_plusminus")?.textContent.trim();
  if (symbol === "+") return "Received";
  if (symbol === "–" || symbol === "-") return "Given"; // "–" is an en dash, not a hyphen
  return "Items";
}

function sumHistorySide(itemsBlockEl) {
  let keys = 0;
  let scrap = 0;
  let itemCount = 0;

  for (const item of itemsBlockEl.querySelectorAll(":scope > .tradehistory_items_group > .history_item")) {
    const info = getHistoryItemInfo(item);
    if (!info) continue;
    itemCount += info.qty;

    const currency = TF2_CURRENCY_BY_NAME[info.name];
    if (!currency) continue;
    if (currency.scrapValue === null) keys += info.qty;
    else scrap += currency.scrapValue * info.qty;
  }

  return { label: historySideLabel(itemsBlockEl), keys, scrap, itemCount };
}

/** Processes one .tradehistoryrow — inserts its total box right after the "You traded with X" description. */
function processHistoryRow(rowEl) {
  if (rowEl.hasAttribute(PROCESSED_ATTR)) return;
  rowEl.setAttribute(PROCESSED_ATTR, "1");

  const description = rowEl.querySelector(":scope > .tradehistory_content > .tradehistory_event_description");
  if (!description) return;

  const sideBlocks = [...rowEl.querySelectorAll(":scope > .tradehistory_content > .tradehistory_items")];
  if (!sideBlocks.length) return;

  const box = renderTotalBox(sideBlocks.map(sumHistorySide));
  if (box) description.insertAdjacentElement("afterend", box);
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────

/** Main export — call once per page load. */
export function addTradeCurrencyTotals() {
  const trades = document.querySelectorAll(".tradeoffer");
  const historyRows = document.querySelectorAll(".tradehistoryrow");
  if (!trades.length && !historyRows.length) return;

  injectStyles();
  trades.forEach(processTradeoffer);
  historyRows.forEach(processHistoryRow);
}

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .${BOX_CLASS} {
      display: flex;
      align-items: stretch;
      margin: 4px 0 8px;
      background: ${COLOR_PANEL_BG};
      border-radius: 4px;
      overflow: hidden;
      color: #ffffff;
      font-size: 11px;
    }
    .tf2utils-currency-total-side {
      flex: 1;
      min-width: 0;
      padding: 5px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tf2utils-currency-total-label {
      color: rgba(255,255,255,0.5);
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tf2utils-currency-total-value {
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .tf2utils-currency-total-divider {
      width: 1px;
      align-self: stretch;
      background: rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}
