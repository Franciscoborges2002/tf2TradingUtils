/**
 * @TF2TradingUtils - oneClickOffer
 * backpack.tf (oldUI) — adds a button next to each listing's existing
 * trade-offer link that instantly sends the trade, no review step:
 *  - Sell listings: buy their item, paying with our own currency.
 *  - Buy orders: sell one of our items, they pay us in currency.
 *
 * Only added when a working token-based trade-offer link already
 * exists and the listing doesn't require adding the other user as a
 * friend first. Buy orders also skip anything we can't match safely
 * by name alone (generic unusual, or modified with paint/spell/parts/
 * killstreak). The actual currency-matching and sending happens on
 * the trade offer page itself — see steamTradeOffer/pageContext/content.js.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/oldUI/oneClickOffer
 */

import { COLOR_ACCENT } from "../../../utils/constants/colors.js";

const BTN_CLASS = "tf2utils-oco-btn";

// Buy orders carrying any of these attributes want a specific
// variant of the item — matching by name alone isn't safe.
const MODIFIED_ATTRS = ["data-spell_1", "data-part_name_1", "data-killstreaker", "data-sheen", "data-level", "data-paint_name"];

/** Item name as shown on the listing, cleaned up for matching. */
function getListingItemName(li) {
  const header = li.querySelector(".listing-title h5");
  const text   = header?.firstChild?.textContent;
  if (!text) return null;
  return text.trim().replace(/\s+/g, " ").replace(/ #\d+$/, "");
}

/** True when a buy order can't be safely matched by name alone. */
function isRiskyBuyOrder(infoEl, itemName) {
  if (
    itemName.includes("Unusual") &&
    !itemName.includes("Haunted Metal Scrap") &&
    !itemName.includes("Horseless Headless Horsemann's Headtaker")
  ) {
    return true; // generic unusual buy order — effect unknown, can't match safely
  }

  for (const attr of MODIFIED_ATTRS) {
    if (!infoEl.hasAttribute(attr)) continue;
    // paint cans are always "painted" — that's not an extra requirement
    if (attr === "data-paint_name" && itemName.includes(infoEl.getAttribute("data-paint_name"))) continue;
    return true;
  }

  return false;
}

/** Add a one-click-offer button to a single listing, if eligible. */
function addButtonToListing(li) {
  const buttonsDiv = li.querySelector(".listing-buttons");
  if (!buttonsDiv) return false;

  if (buttonsDiv.querySelector(`.${BTN_CLASS}`)) return false; // already added

  // Needs to add the other user as a friend first — our automated
  // flow can't work without a ready-to-use token-based trade offer link.
  if (buttonsDiv.querySelector(".fa-user-plus")) return false;

  const sendOfferLink = buttonsDiv.querySelector("a.btn-success[href], a.btn-primary[href]");
  if (!sendOfferLink) return false;

  const href = sendOfferLink.getAttribute("href");
  if (!href || href.startsWith("steam://")) return false;

  const infoEl = li.querySelector(".listing-item > div");
  const price  = infoEl?.getAttribute("data-listing_price");
  if (!price) return false;

  const url = new URL(href, location.origin);
  url.searchParams.set("tf2u_price", price);

  const isBuyOrder = infoEl.getAttribute("data-listing_intent") === "buy";

  if (isBuyOrder) {
    if (href.includes("for_item=")) return false; // unexpected on a buy order — bail rather than guess

    const itemName = getListingItemName(li);
    if (!itemName || isRiskyBuyOrder(infoEl, itemName)) return false;

    url.searchParams.set("tf2u_item_name", itemName);
    url.searchParams.set("tf2u_intent", "buy");
  } else {
    // Sell listing — Steam uses "for_item" to pre-fill the listed item
    // on the trade offer page automatically. Without it we can't tell
    // which specific item to buy.
    if (!href.includes("for_item=")) return false;
  }

  const btn = sendOfferLink.cloneNode(true);
  btn.classList.add(BTN_CLASS);
  btn.setAttribute("href", url.toString());
  btn.style.backgroundColor = COLOR_ACCENT;
  btn.style.borderColor    = COLOR_ACCENT;
  btn.setAttribute("title", "One-Click Offer");
  btn.setAttribute("data-original-title", "Instantly sends this trade offer with the correct currency — no review step.");

  buttonsDiv.appendChild(btn);
  return true;
}

/**
 * Main export — call once per page load. Works for both the /stats
 * and /classifieds listing columns.
 */
export function addOneClickOffer() {
  const listings = document.querySelectorAll("li.listing");
  if (!listings.length) return;

  let added = 0;
  listings.forEach((li) => {
    if (addButtonToListing(li)) added++;
  });

  console.log(`[TF2TradingUtils] oneClickOffer: added ${added} button(s)`);
}
