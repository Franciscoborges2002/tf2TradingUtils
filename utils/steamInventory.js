/**
 * Shared helpers for detecting which game's tab is active on
 * steamcommunity.com's multi-game inventory page (each Steam account
 * has one inventory page listing every game they own items for — TF2,
 * CS2, etc. — switchable via tabs), so TF2-specific scripts don't
 * misfire while some other game's tab is the one actually showing.
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
