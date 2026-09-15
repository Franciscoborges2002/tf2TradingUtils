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

/**
 * Finds the item detail panel currently shown for a selected item, plus
 * its <h1> title — shared by any script that reacts to which item is
 * selected (itemLinks, copyClipboard). #iteminfo0/#iteminfo1 are two
 * alternating panels Steam swaps between; whichever one actually has an
 * <h1> right now is the one in use.
 */
export function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  const h0 = c0?.querySelector("h1");
  if (h0) return { container: c0, title: h0 };

  const h1 = c1?.querySelector("h1");
  if (h1) return { container: c1, title: h1 };

  return null;
}

/**
 * The item's real full descriptive name (quality/killstreak-tier/
 * Australium/Festivized/Non-Craftable all baked in, exactly as Steam
 * Market shows it) — read from the page's own "View in Community
 * Market" link href instead of the h1 title. Unlike the h1, that link's
 * market_hash_name is never overridden by a custom name tag: confirmed,
 * a renamed "'Smolder'n Skunk Spray'" (real item: Strange Australium
 * Flame Thrower) still links to
 * ".../market/listings/440/Strange%20Australium%20Flame%20Thrower"
 * here — the one place Australium survives at all once a name tag's
 * involved, since neither the h1 nor the "Original name" notice (see
 * getRenamedOriginalName() below) carry it.
 *
 * Only present for tradable + marketable items — null otherwise
 * (currency, e.g., has no Market listing at all), and explicitly
 * excludes itemLinks' own injected "Market" button, which points to
 * this same URL pattern and would otherwise be matched right back.
 */
export function getMarketListingName(container) {
  const marketLink = [...container.querySelectorAll(`a[href*="/market/listings/${TF2_APPID}/"]`)]
    .find((a) => !a.classList.contains("custom-link-btn"));
  if (!marketLink) return null;

  const match = (marketLink.getAttribute("href") || "").match(
    new RegExp(`/market/listings/${TF2_APPID}/(.+)$`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Steam shows a renamed item's custom name-tag text in its own <h1>
 * title, not the item's real name (e.g. an Australium Flame Thrower
 * nicknamed "'Smolder'n Skunk Spray'" shows that as its h1). The "This
 * item has been renamed. Original name: "X"" notice doesn't fully fix
 * this either — it only gives the bare weapon name ("Flame Thrower"),
 * with no quality/killstreak-tier/Australium/Festivized. Detected via
 * that notice's text content, not its CSS module classes, which look
 * auto-generated per Steam build and aren't safe to depend on. Meant
 * only to decide whether an item is identifiable at all when
 * getMarketListingName() above comes back empty — that one's the real
 * fix, recovering the true full name a different way, and should always
 * be tried first regardless of whether this notice is present.
 */
export function getRenamedOriginalName(container) {
  const match = container.textContent.match(/This item has been renamed\.\s*Original name:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Wraps the item's <h1> title in a flex row (creating it once, reusing
 * it on a later call for the same title instead of nesting another
 * wrapper around it) so anything meant to sit right beside the item
 * name (e.g. copyClipboard's copy icon) can, while itemLinks' own
 * sell-button/links row/error message still anchor off the row as a
 * whole ("afterend") regardless of which script wrapped it first. The
 * title's own text/children are left untouched, so anything reading
 * title.textContent elsewhere is unaffected.
 */
export function getOrCreateTitleRow(title) {
  const parent = title.parentElement;
  if (parent?.classList.contains("custom-title-row")) return parent;

  const row = document.createElement("div");
  row.className = "custom-title-row";
  row.style.cssText = "display:flex;align-items:center;gap:8px;";
  title.insertAdjacentElement("beforebegin", row);
  row.appendChild(title);
  return row;
}

/**
 * Finds the item's description block within its info panel (case
 * contents, Unusual effects list, set bonuses, etc.) — the one section
 * made up entirely of lines carrying Steam's own `--white-space:
 * pre-line` inline custom property. Steam's own class names on this
 * page are hashed CSS-module output (e.g. "_3JCkAyd9cnB90tRcDLPp4W",
 * "FYJ4NYxpWeIha0N1-jUcm") that can change on any Steam frontend
 * redeploy, so the block is matched structurally via that property
 * instead — confirmed set individually per description line, not
 * inherited from a shared class. Returns null for items with no
 * description at all (most plain weapons/currency).
 * @param {Element} root - the item's info panel (see pickContainer())
 */
export function findDescriptionContainer(root) {
  const lines = [...root.querySelectorAll("div")].filter(
    (el) => el.style.getPropertyValue("--white-space") === "pre-line"
  );
  if (!lines.length) return null;

  const parent = lines[0].parentElement;
  // Every line should share one parent — Steam renders them as a flat
  // list of siblings. If they don't, this heuristic matched something
  // unrelated, so bail rather than act on the wrong element.
  if (!parent || !lines.every((el) => el.parentElement === parent)) return null;

  return parent;
}

/**
 * The item's Unusual effect name, read from its description panel's
 * "★ Unusual Effect: <name>" line (confirmed real text/color — gold,
 * rgb(255, 215, 0) — on a live Steam inventory page). Null for
 * non-Unusual items, or any item with no description block at all.
 * @param {Element} root - the item's info panel (see pickContainer())
 */
export function getUnusualEffectName(root) {
  const descBlock = findDescriptionContainer(root);
  if (!descBlock) return null;

  const line = [...descBlock.children].find((el) => /Unusual Effect:/i.test(el.textContent));
  if (!line) return null;

  return line.textContent.replace(/^.*Unusual Effect:\s*/i, "").trim() || null;
}
