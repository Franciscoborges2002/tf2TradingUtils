/*
@TF2TradingUtils
Description:
Adds a small copy icon right beside the item name on a steamcommunity.com
inventory item panel (right after the image/separator, in the title's
own row) — clicking it copies the item's real name to the clipboard.
Split out of steamcommunity.com/itemLinks so the two features can be
toggled/maintained independently, same as stntrading.eu's own
copyClipboard script.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/copyClipboard
*/

import { COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { isTf2InventoryActive, pickContainer, getMarketListingName, getOrCreateTitleRow } from "../../utils/steamInventory.js";
import { loadIconSvg } from "../../utils/icons.js";

/**
 * Watches for the selected item's panel and keeps its copy button in
 * sync — called on an interval/MutationObserver by the router, same as
 * itemLinks, since Steam's inventory page swaps between many items
 * without a page navigation.
 */
export function addItemNameCopyButton() {
  if (!isTf2InventoryActive()) return false;

  const picked = pickContainer();
  if (!picked) return false;

  const { container, title } = picked;

  // Prefer the item's real name off its own Market listing link (see
  // getMarketListingName()'s own doc) — survives a custom name tag,
  // unlike the h1 text itself. Falls back to the h1 when there's no
  // Market listing at all (e.g. currency); copying that is still better
  // than nothing.
  const itemName = getMarketListingName(container) || title.textContent.trim();
  if (!itemName) return false;

  // Prevent duplicate for the same item — a separate marker from
  // itemLinks' own injectedFor, since the two scripts run independently
  // and shouldn't fight over the same one.
  if (container.dataset.copyBtnFor === itemName && container.querySelector(".custom-copy-btn")) {
    return true;
  }

  const titleRow = getOrCreateTitleRow(title);
  // Removed before (re-)creating rather than just appended, in case this
  // runs again for the same item while an old button (from before a
  // partial Steam re-render) is still hanging around — keeps this a
  // single button instead of stacking a second one on a surviving one.
  titleRow.querySelector(".custom-copy-btn")?.remove();
  titleRow.appendChild(createCopyButton(itemName));

  container.dataset.copyBtnFor = itemName;
  return true;
}

/**
 * Copies `text` to the clipboard, briefly swapping the button's own
 * icon to a checkmark to confirm it worked — same copy/check icons and
 * loadIconSvg() cache scrap.tf/itemLinks and stntrading.eu/copyClipboard
 * already use.
 */
function createCopyButton(text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "custom-copy-btn";
  btn.title = "Copy item name";
  btn.setAttribute("aria-label", "Copy item name");
  btn.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;" +
    "width:26px;height:26px;padding:0;flex-shrink:0;border-radius:6px;cursor:pointer;" +
    `background:${COLOR_PANEL_BG};color:#ffffff;` +
    "border:1px solid rgba(255,255,255,0.15);transition:0.15s ease;";

  let copySvg = "";
  let checkSvg = "";
  Promise.all([loadIconSvg("copy"), loadIconSvg("check")])
    .then(([copy, check]) => {
      copySvg = copy;
      checkSvg = check;
      btn.innerHTML = copySvg;
    })
    .catch((err) => console.warn("[TF2Utils] Failed to load copy icon:", err));

  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        btn.innerHTML = checkSvg;
        btn.style.color = "#2e8b40";
        setTimeout(() => {
          btn.innerHTML = copySvg;
          btn.style.color = "#ffffff";
        }, 1200);
      })
      .catch((err) => console.warn("[TF2Utils] Failed to copy name:", err));
  });

  btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.15)"; });
  btn.addEventListener("mouseleave", () => { btn.style.filter = "none"; });

  return btn;
}
