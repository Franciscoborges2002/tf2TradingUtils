/**
 * @TF2TradingUtils - groupTradeItems
 * On the trade offers inbox and trade history pages, groups identical
 * items shown on a single trade side (e.g. a stack of Refined Metal
 * rendered as N separate entries) into one entry with a "×N" count
 * badge, instead of showing N duplicates.
 *
 * Two different DOM shapes to handle:
 *  - /tradeoffers/: ".tradeoffer_item_list" > ".trade_item" icons.
 *    Grouped by "data-economy-item" (classinfo path), not assetid —
 *    Steam's own markup here repeats the same assetid across every
 *    copy of a stacked item, so assetid isn't reliable per-instance.
 *  - /tradehistory/: ".tradehistory_items_group" > ".history_item"
 *    entries (some are <a> with an image, given items are plain
 *    <span> with no image). Grouped by the ".history_item_name" text
 *    directly, which is reliable here.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/groupTradeItems
 */

import { COLOR_PANEL_BG } from "../../utils/constants/colors.js";

const STYLES_ID = "tf2utils-group-trade-items-styles";
const PROCESSED_ATTR = "data-tf2utils-grouped";

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .tf2utils-trade-item-qty {
      position: absolute;
      bottom: 2px;
      right: 2px;
      background: ${COLOR_PANEL_BG};
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.3;
      pointer-events: none;
      z-index: 2;
    }
    .tf2utils-history-item-qty {
      display: inline-block;
      margin-left: 4px;
      background: ${COLOR_PANEL_BG};
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.3;
    }
  `;
  document.head.appendChild(style);
}

/** Removes an element along with an adjacent ", " text-node separator, if any. */
function removeWithSeparator(el) {
  const next = el.nextSibling;
  const prev = el.previousSibling;
  el.remove();

  if (next?.nodeType === Node.TEXT_NODE && /^\s*,\s*$/.test(next.textContent)) {
    next.remove();
  } else if (prev?.nodeType === Node.TEXT_NODE && /^\s*,\s*$/.test(prev.textContent)) {
    prev.remove();
  }
}

/** Groups identical items within a single /tradeoffers/ .tradeoffer_item_list. */
function groupOfferList(listEl) {
  if (listEl.hasAttribute(PROCESSED_ATTR)) return;
  listEl.setAttribute(PROCESSED_ATTR, "1");

  const items = [...listEl.querySelectorAll(":scope > .trade_item")];
  const groups = new Map();

  for (const item of items) {
    const key = item.getAttribute("data-economy-item");
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const [keep, ...rest] = group;
    rest.forEach((el) => el.remove());

    keep.style.position = "relative";
    const badge = document.createElement("span");
    badge.className = "tf2utils-trade-item-qty";
    badge.textContent = `×${group.length}`;
    keep.appendChild(badge);
  }
}

/** Groups identical items within a single /tradehistory/ .tradehistory_items_group. */
function groupHistoryList(groupEl) {
  if (groupEl.hasAttribute(PROCESSED_ATTR)) return;
  groupEl.setAttribute(PROCESSED_ATTR, "1");

  const items = [...groupEl.querySelectorAll(":scope > .history_item")];
  const groups = new Map();

  for (const item of items) {
    const key = item.querySelector(".history_item_name")?.textContent.trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const [keep, ...rest] = group;
    rest.forEach(removeWithSeparator);

    const badge = document.createElement("span");
    badge.className = "tf2utils-history-item-qty";
    badge.textContent = `×${group.length}`;
    keep.querySelector(".history_item_name")?.appendChild(badge);
  }
}

/** Main export — call once per page load. */
export function groupTradeItems() {
  const offerLists = document.querySelectorAll(".tradeoffer_item_list");
  const historyGroups = document.querySelectorAll(".tradehistory_items_group");
  if (!offerLists.length && !historyGroups.length) return;

  injectStyles();
  offerLists.forEach(groupOfferList);
  historyGroups.forEach(groupHistoryList);
}
