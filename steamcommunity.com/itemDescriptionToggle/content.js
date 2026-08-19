/**
 * @TF2TradingUtils - itemDescriptionToggle
 * Adds a "Hide description"/"Show description" button to the item info
 * panel (#iteminfo0/#iteminfo1) on steamcommunity.com's inventory page,
 * right above the item's description text (case contents, Unusual
 * effects list, set bonuses, etc.) — some of that text runs very long
 * (a themed case can list 30+ lines) and pushes the panel's own action
 * buttons (Sell, View in Community Market) far down the page.
 *
 * Whether it starts shown or hidden is read from the popup's Settings
 * view (chrome.storage.local, "showItemDescriptionsByDefault" — shown
 * unless the user's explicitly turned that off), same storage this
 * extension's other per-user settings (key/Earbuds price) already use.
 *
 * Steam's own class names on this page are hashed CSS-module output
 * (e.g. "_3JCkAyd9cnB90tRcDLPp4W", "FYJ4NYxpWeIha0N1-jUcm") that can
 * change on any Steam frontend redeploy, so the description block isn't
 * found by matching one of those directly. Every description line does
 * carry a stable inline custom property instead — `--white-space:
 * pre-line` — set individually per line (not inherited from a shared
 * class), so the block is identified structurally: collect every div
 * with that property, then take their shared parent — the one panel
 * section made up entirely of description lines and nothing else.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/itemDescriptionToggle
 */

import { COLOR_ACCENT } from "../../utils/constants/colors.js";
import { getSettings } from "../../utils/settings.js";

const STYLES_ID = "tf2utils-item-desc-toggle-styles";
const TOGGLE_BTN_CLASS = "tf2utils-desc-toggle-btn";
const PROCESSED_ATTR = "data-tf2utils-desc-toggle-for";

function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  if (c0?.querySelector("h1")) return c0;
  if (c1?.querySelector("h1")) return c1;
  return null;
}

/**
 * Finds the item's description block within its info panel — the one
 * section made up entirely of lines carrying Steam's own
 * `--white-space: pre-line` inline custom property (see file header
 * for why that, not a class name, is what's matched). Returns null for
 * items with no description at all (most plain weapons/currency).
 */
function findDescriptionContainer(root) {
  const lines = [...root.querySelectorAll("div")].filter(
    (el) => el.style.getPropertyValue("--white-space") === "pre-line"
  );
  if (!lines.length) return null;

  const parent = lines[0].parentElement;
  // Every line should share one parent — Steam renders them as a flat
  // list of siblings. If they don't, this heuristic matched something
  // unrelated, so bail rather than toggle the wrong element.
  if (!parent || !lines.every((el) => el.parentElement === parent)) return null;

  return parent;
}

async function getShowByDefault() {
  const settings = await getSettings();
  return settings.showItemDescriptionsByDefault;
}

function makeToggleButton(descBlock, showByDefault) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = TOGGLE_BTN_CLASS;
  btn.textContent = showByDefault ? "Hide description" : "Show description";

  btn.addEventListener("click", () => {
    const nowHidden = descBlock.style.display !== "none";
    descBlock.style.display = nowHidden ? "none" : "";
    btn.textContent = nowHidden ? "Show description" : "Hide description";
  });

  return btn;
}

// Our own button insertion below is itself a childList mutation, which
// re-triggers the MutationObserver watching this same subtree — so a
// second processContainer() call for the same container can start
// before the first one's async settings fetch resolves and it gets a
// chance to mark itself processed, each inserting its own button. This
// blocks any second call for a container already mid-flight.
const inFlightContainers = new WeakSet();

async function processContainer(container) {
  const title = container.querySelector("h1");
  const itemName = title?.textContent.trim();
  if (!itemName) return;

  // Steam re-renders this panel's content at least once after initial
  // mount (e.g. once price data streams in), wiping out anything
  // injected earlier while leaving the container node itself in place
  // — same re-render quirk itemLinks/content.js guards against — so
  // don't just trust the marker, confirm the button's actually still there.
  if (container.getAttribute(PROCESSED_ATTR) === itemName && container.querySelector(`.${TOGGLE_BTN_CLASS}`)) {
    return;
  }
  if (inFlightContainers.has(container)) return;
  inFlightContainers.add(container);

  try {
    const descBlock = findDescriptionContainer(container);
    container.querySelectorAll(`.${TOGGLE_BTN_CLASS}`).forEach((el) => el.remove());
    if (!descBlock) return;

    injectStyles();

    const showByDefault = await getShowByDefault();
    descBlock.style.display = showByDefault ? "" : "none";
    descBlock.insertAdjacentElement("beforebegin", makeToggleButton(descBlock, showByDefault));
    container.setAttribute(PROCESSED_ATTR, itemName);
  } finally {
    inFlightContainers.delete(container);
  }
}

/** Main export — call once per page load, then again on every DOM mutation of the panel (Steam re-renders it per item/price update). */
export function addItemDescriptionToggle() {
  const container = pickContainer();
  if (!container) return;
  processContainer(container).catch((err) => console.warn("[TF2Utils] itemDescriptionToggle failed:", err));
}

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .${TOGGLE_BTN_CLASS} {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      margin-bottom: 6px;
      border-radius: 6px;
      border: 1px solid ${COLOR_ACCENT};
      background: transparent;
      color: ${COLOR_ACCENT};
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .${TOGGLE_BTN_CLASS}:hover {
      background: ${COLOR_ACCENT};
      color: #ffffff;
    }
  `;
  document.head.appendChild(style);
}
