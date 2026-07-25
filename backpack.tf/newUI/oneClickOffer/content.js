/**
 * @TF2TradingUtils - oneClickOffer
 * backpack.tf (newUI / next.backpack.tf) — adds a button next to
 * bot-managed listings' existing trade-offer action that instantly
 * sends the trade, no review step.
 *
 * Only added when:
 *  - the listing's action is a real Steam trade-offer link, not a
 *    marketplace.tf cart-add link (some listings only offer that), and
 *  - the listing carries the "BOT" user-agent badge
 *    (.listing__details__user-agent) — our signal that it's managed by
 *    an automated trading bot and safe for an unattended offer.
 *
 * Everything needed is read straight from the listing's own DOM:
 *  - Price: plain text inside ".item__price".
 *  - Buy vs. sell: ".text-sell" / ".text-buy" next to the item name.
 *  - Sell listings: the item thumbnail's link is "/classifieds/440_<id>"
 *    where <id> is the seller's actual Steam assetid — reused directly
 *    as Steam's own "for_item" param, same mechanism as the old UI.
 *  - Buy orders: no specific item exists yet, so it's matched by name
 *    (from ".listing__details__header") in our own inventory instead,
 *    same as the old UI's buy-order handling.
 *
 * The actual currency-matching and sending happens on the trade offer
 * page itself — see steamTradeOffer/pageContext/content.js.
 *
 * NOTE: unlike the sell-listing path (assetid taken straight from a
 * real link, same as old UI), buy orders still only get the name-based
 * "Unusual" skip — old UI's spell/paint/killstreak attribute check
 * isn't ported here since the equivalent data attributes on this DOM
 * aren't confirmed yet.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/oneClickOffer
 */

const BTN_CLASS = "tf2utils-oco-btn";

/** Item name as shown on the listing header, cleaned up for matching. */
function getListingItemName(listingEl) {
  const header = listingEl.querySelector(".listing__details__header");
  if (!header) return null;
  return header.textContent.trim().replace(/\s+/g, " ").replace(/ #\d+$/, "");
}

/** "buy" | "sell" | null, from the icon next to the item name. */
function getListingIntent(listingEl) {
  const header = listingEl.querySelector(".listing__details__header");
  if (!header) return null;
  if (header.querySelector(".text-sell")) return "sell";
  if (header.querySelector(".text-buy"))  return "buy";
  return null;
}

/** Seller's real Steam assetid for a sell listing, from the item link. */
function getSellListingAssetid(listingEl) {
  const itemLink = listingEl.querySelector('a.item[href^="/classifieds/440_"]');
  const match    = itemLink?.getAttribute("href")?.match(/^\/classifieds\/440_(\d+)$/);
  return match ? match[1] : null;
}

/** Price text as shown on the listing, e.g. "21.44 ref" or "2 keys, 5.33 ref". */
function getListingPrice(listingEl) {
  const priceEl = listingEl.querySelector(".item__price");
  return priceEl?.textContent?.trim().replace(/\s+/g, " ") ?? null;
}

/** Add a one-click-offer button to a single listing, if eligible. */
function addButtonToListing(listingEl) {
  const actionsDiv = listingEl.querySelector(".listing__details__actions");
  if (!actionsDiv) return false;
  if (actionsDiv.querySelector(`.${BTN_CLASS}`)) return false; // already added

  // Bot-managed listings show a "BOT" badge — our signal this listing
  // supports instant, unattended trade offers.
  if (!actionsDiv.querySelector(".listing__details__user-agent")) return false;

  const actionLink = actionsDiv.querySelector("a.listing__details__actions__action[href]");
  if (!actionLink) return false;

  const href = actionLink.getAttribute("href");
  // Some listings only offer a marketplace.tf cart-add link instead of
  // a direct trade offer — nothing for us to do there.
  if (!href || !href.startsWith("https://steamcommunity.com/tradeoffer/")) return false;

  const price = getListingPrice(listingEl);
  if (!price) return false;

  const intent = getListingIntent(listingEl);
  if (!intent) return false; // couldn't tell buy from sell — don't guess

  const url = new URL(href);
  url.searchParams.set("tf2u_price", price);

  if (intent === "sell") {
    const assetid = getSellListingAssetid(listingEl);
    if (!assetid) return false;
    url.searchParams.set("for_item", `440_2_${assetid}`);
  } else {
    const itemName = getListingItemName(listingEl);
    if (!itemName) return false;
    if (
      itemName.includes("Unusual") &&
      !itemName.includes("Haunted Metal Scrap") &&
      !itemName.includes("Horseless Headless Horsemann's Headtaker")
    ) {
      return false; // generic unusual buy order — effect unknown, can't match safely
    }
    url.searchParams.set("tf2u_item_name", itemName);
    url.searchParams.set("tf2u_intent", "buy");
  }

  const btn = actionLink.cloneNode(true);
  btn.classList.add(BTN_CLASS);
  btn.setAttribute("href", url.toString());
  btn.style.color = "#B35112";
  btn.setAttribute("title", "One-Click Offer");

  actionsDiv.appendChild(btn);
  return true;
}

function scan() {
  document.querySelectorAll(".listing").forEach(addButtonToListing);
}

/**
 * Main export — call once per page load. next.backpack.tf is a SPA,
 * so listings render asynchronously and can be replaced/re-rendered;
 * re-scan on a short delay schedule plus a debounced MutationObserver,
 * matching the pattern used by filterSpecialListings (newUI).
 */
export function addOneClickOfferNewUI() {
  scan();
  setTimeout(scan, 600);
  setTimeout(scan, 1500);
  setTimeout(scan, 3000);

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 350);
  }).observe(document.body, { childList: true, subtree: true });
}
