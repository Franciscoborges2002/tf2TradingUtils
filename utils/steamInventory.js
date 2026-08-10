/**
 * Shared helpers for steamcommunity.com's inventory page: which game's
 * tab is active (each Steam account has one inventory page listing
 * every game they own items for — TF2, CS2, etc. — switchable via
 * tabs), and whether it's the logged-in user's own inventory or someone
 * else's — so scripts that only make sense in one of those contexts
 * don't misfire in the other.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

import { TF2_APPID, TF2_CONTEXTID } from "./constants/tf2Economy.js";

/** Finds the TF2 inventory grid container, regardless of the owner's steamid64. */
export function findTf2InventoryContainer() {
  return document.querySelector(`[id^="inventory_"][id$="_${TF2_APPID}_${TF2_CONTEXTID}"]`);
}

/**
 * Whether the TF2 tab is the one currently active on a Steam inventory
 * page. Steam sets the URL hash to the active appid when switching
 * tabs (e.g. "#440" for TF2, "#730" for CS2) — but there's no hash yet
 * on first load, and whichever game happens to render by default there
 * isn't necessarily TF2, so that case falls back to checking the TF2
 * container's own visibility instead.
 */
export function isTf2InventoryActive() {
  if (location.hash) return location.hash === `#${TF2_APPID}`;
  const container = findTf2InventoryContainer();
  return !!container && container.style.display !== "none";
}

/**
 * Whether this is the logged-in user's own inventory, not someone
 * else's — relevant for anything that only makes sense on your own
 * items (e.g. a "list for sale" link). Signaled by
 * .inventory_links .inventory_rightnav actually having content: a
 * "Trade Offers" shortcut button (to the viewer's own trade offers
 * inbox) plus a "More..." dropdown (trade/inventory/gift history,
 * privacy settings — all account-management links that only make sense
 * for your own inventory). On someone else's inventory page, that same
 * container renders empty instead.
 */
export function isOwnInventory() {
  return !!document.querySelector(".inventory_links .inventory_rightnav .new_trade_offer_btn");
}
