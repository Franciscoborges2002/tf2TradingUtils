/**
 * @TF2TradingUtils - unusualEffectBackground
 * For an Unusual item shown in the item info panel (#iteminfo0/#iteminfo1)
 * on steamcommunity.com's inventory page, sets that panel's item-icon
 * background to a preview image of the item's own Unusual effect — so
 * the hat/weapon renders over its actual particle effect instead of a
 * plain background.
 *
 * Effect preview images come from itempedia.tf:
 * https://itempedia.tf/assets/particles/<effect_id>_94x94.png — NOT
 * backpack.tf, whose own CDN (same image, same naming shape) sends
 * `Cross-Origin-Resource-Policy: same-origin`, which makes the browser
 * itself refuse to load it as a background from a steamcommunity.com
 * page (confirmed: net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin). itempedia.tf
 * sends no such header. Only 94x94 exists on either host — every other
 * size tried (188x188, 380x380, 360x360, bare) 404s.
 *
 * itempedia.tf's own site says its images are "sourced from
 * Backpack.tf" — likely a re-host of the same files on a domain that
 * doesn't set the blocking header, not an independently-produced set.
 *
 * The effect NAME (not id) is what's actually shown on the page — the
 * item's own title never includes it (e.g. "Unusual Jolly Jingler"),
 * but the description block has a "★ Unusual Effect: <name>" line
 * (confirmed against a real panel). That name is looked up against
 * utils/UnusualIds.js's name -> id map (the same bundled data
 * stntrading.eu/itemLinks already uses) to get the id backpack.tf's URL
 * needs.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/unusualEffectBackground
 */

import { isTf2InventoryActive } from "../../utils/steamInventory.js";
import { UnusualIds } from "../../utils/UnusualIds.js";

// ─────────────────────────────────────────────────────────────
// Grid-cell (inventory tile) backgrounds. Tiles carry no effect-name
// text anywhere in their own markup (unlike the detail panel's "★
// Unusual Effect: X" line) — only an image, an id
// ("440_2_<assetid>"), and a border/background color. Unusual quality's
// border color is Valve's own well-known constant, #8650AC / rgb(134,
// 80, 172) — used to find candidate tiles without needing any extra data.
//
// The effect name for a given tile comes from steamcommunity.com/
// inventoryFetchBridge (world: "MAIN") — it observes the page's own
// same-origin inventory JSON requests
// (https://steamcommunity.com/inventory/<steamid64>/440/2?...), the
// ones the page's own UI already makes to render itself (confirmed
// live), and caches the assetid -> description mapping from every
// response seen. No separate fetch happens here — this just asks that
// bridge for whatever it's observed so far, fresh on every scan (the
// page paginates as you scroll, so the bridge's map only grows over
// time; re-asking each scan picks up newly-loaded items instead of
// freezing on a single snapshot). Confirmed response shape: each
// `descriptions[]` entry (matched to an `assets[]` entry by
// classid+instanceid) has a `descriptions` array whose first line for
// an Unusual is "★ Unusual Effect: <name>", plus a `tags[]` Quality
// entry and `name_color` both confirming "8650AC" for Unusual — same
// color as the tile border check, just double confirmation once seen.
// ─────────────────────────────────────────────────────────────
const GRID_UNUSUAL_BORDER_COLOR = "rgb(134, 80, 172)"; // Valve's #8650AC Unusual quality color

function requestInventoryMap() {
  return new Promise((resolve) => {
    const eventId = `tf2utils_invmap_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => resolve(new Map()), 3000);
    window.addEventListener(eventId, (e) => { clearTimeout(timeout); resolve(e.detail?.map ?? new Map()); }, { once: true });
    window.dispatchEvent(new CustomEvent("tf2utils_inv_get_map", { detail: { eventId } }));
  });
}

/** The "★ Unusual Effect: <name>" line out of a description object's own `descriptions` array. */
function effectNameFromDescription(desc) {
  for (const line of desc.descriptions ?? []) {
    const match = typeof line.value === "string" ? line.value.match(/Unusual Effect:\s*(.+)/i) : null;
    if (match) return match[1].trim();
  }
  return null;
}

async function applyGridCellBackgrounds() {
  const allTiles = [...document.querySelectorAll('.itemHolder .item[id^="440_2_"]')];
  const tiles = allTiles.filter((el) => !el.dataset.tf2utilsEffectBg && el.style.borderColor === GRID_UNUSUAL_BORDER_COLOR);
  if (!tiles.length) return;

  const itemMap = await requestInventoryMap();

  for (const tile of tiles) {
    const assetid = tile.id.match(/^440_2_(\d+)$/)?.[1];
    if (!assetid) {
      console.warn(`[TF2TradingUtils] unusualEffectBackground: tile id "${tile.id}" didn't match the expected 440_2_<assetid> shape.`);
      continue;
    }

    // Not yet in the map just means its inventory page hasn't loaded
    // yet — not an error, it'll be picked up on a later scan.
    const desc = itemMap.get(assetid);
    if (!desc) continue;

    const effectName = effectNameFromDescription(desc);
    if (!effectName) {
      console.warn(`[TF2TradingUtils] unusualEffectBackground: assetid ${assetid} (${desc.market_hash_name ?? desc.name}) has no "Unusual Effect: X" description line.`, desc);
      continue;
    }

    const effectId = UnusualIds[effectName];
    if (effectId == null) {
      console.warn(`[TF2TradingUtils] unusualEffectBackground: effect name "${effectName}" (assetid ${assetid}) not found in UnusualIds map.`);
      continue;
    }

    const img = tile.querySelector("img");
    if (!img) {
      console.warn(`[TF2TradingUtils] unusualEffectBackground: tile for assetid ${assetid} has no <img> to anchor the background to.`);
      continue;
    }

    applyEffectBackground(tile, img, effectId)
      .catch((err) => console.warn("[TF2TradingUtils] unusualEffectBackground: grid cell background failed:", err));
  }
}

// inventoryFetchBridge (world: "MAIN") dispatches this the moment it
// merges NEW data into its map — including for prerendered, still
// display:none pages the user hasn't navigated to yet. Re-scanning
// right away (rather than waiting for whatever unrelated DOM mutation
// happens to trigger the page-wide re-scan next) means an invisible
// tile gets its IntersectionObserver attached as soon as it's
// resolvable, so it's already watching by the time the user pages to
// it — instead of only catching up retroactively on some later,
// unrelated mutation.
window.addEventListener("tf2utils_inv_updated", () => {
  applyGridCellBackgrounds().catch((err) => console.warn("[TF2TradingUtils] unusualEffectBackground: grid cell pass failed:", err));
});

function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  const h0 = c0?.querySelector("h1");
  if (h0) return { container: c0, title: h0 };

  const h1 = c1?.querySelector("h1");
  if (h1) return { container: c1, title: h1 };

  return null;
}

/**
 * The item's "Tags:" line — same signal itemLinks/content.js uses for
 * quality, reused here just to confirm "Unusual" rather than guessing
 * off the title text (which never includes the effect anyway).
 */
function hasUnusualTag(container) {
  const tagsEl = [...container.querySelectorAll("span")]
    .find((el) => el.textContent.trim().startsWith("Tags:"));
  if (!tagsEl) return false;

  return tagsEl.textContent
    .replace(/^Tags:\s*/, "")
    .split(",")
    .map((t) => t.trim())
    .includes("Unusual");
}

/**
 * The "★ Unusual Effect: <name>" description line's effect name, or
 * null if not found. querySelectorAll("div") returns wrapper divs
 * before their own children (document order), and a wrapper's
 * textContent already includes every description line concatenated —
 * matching against that greedily grabbed everything after "Unusual
 * Effect:" through to the last line, not just the effect name.
 * itemDescriptionToggle hit the same problem and solved it by only
 * matching divs carrying Steam's own `--white-space: pre-line` inline
 * marker, which is set per individual line, not on the wrapper — reused
 * here for the same reason.
 */
function getEffectName(container) {
  for (const el of container.querySelectorAll("div")) {
    if (el.style.getPropertyValue("--white-space") !== "pre-line") continue;
    const match = el.textContent.trim().match(/Unusual Effect:\s*(.+)/i);
    if (match) return match[1].trim();
  }
  return null;
}

/** The item's own icon <img> (matched by alt text) plus its direct parent — the wrapper the effect background gets set on. */
function getIconElements(container, itemName) {
  const img = [...container.querySelectorAll("img")].find((el) => el.alt === itemName);
  if (!img?.parentElement) return null;
  return { img, wrapper: img.parentElement };
}

function particleUrl(effectId) {
  return `https://itempedia.tf/assets/particles/${effectId}_94x94.png`;
}

// How much bigger than the item icon's own box the effect renders —
// centered on the icon, so it spills out past the icon's edges on
// every side instead of being clipped tightly to it. User-configurable
// (popup Settings, "Unusual effect background size", 1–1.8×) —
// fetched once and reused, same "read once from chrome.storage.local"
// pattern itemDescriptionToggle's getShowByDefault() uses.
let effectScalePromise = null;
function getEffectScale() {
  if (!effectScalePromise) {
    effectScalePromise = new Promise((resolve) => {
      chrome.storage.local.get(["settings"], (result) => {
        const value = result.settings?.unusualEffectScale;
        resolve(typeof value === "number" && value > 0 ? value : 1.3);
      });
    });
  }
  return effectScalePromise;
}

// Grid tiles on an inventory "page" other than the currently displayed
// one sit under a display:none ancestor — their <img> can be fully
// loaded (img.complete/naturalWidth both true) while still measuring a
// 0x0 box, since display:none elements get no layout box at all. A
// plain image load event doesn't help there, and Steam swaps pages by
// toggling that display:none/:block on already-rendered containers
// (no nodes added/removed), so the MutationObserver driving re-scans
// elsewhere in this file never fires for it either. Tracks which
// <img>s already have a pending IntersectionObserver so a tile that
// gets re-scanned before becoming visible doesn't pile up duplicates.
const pendingVisibilityRetries = new WeakSet();

/**
 * Sets the effect preview as the wrapper's background, sized/positioned
 * to match the <img>'s own rendered box (via getBoundingClientRect, not
 * the wrapper's own dimensions) scaled up by EFFECT_SCALE around its
 * center — confirmed live that `background-size: cover` +
 * `background-position: center` on the wrapper renders noticeably
 * offset from the actual item icon. The wrapper's inline style carries
 * `--justify: start` (likely flexbox `justify-content: start`,
 * left-aligning the img within a wrapper that can be wider than the img
 * itself), which "center" doesn't account for — pinning to the img's
 * actual geometry sidesteps that regardless of the real cause.
 *
 * Waits for the icon <img> to actually finish loading before measuring
 * it — confirmed live that measuring too early reads a 0x0 box (the
 * browser hasn't laid it out yet without known intrinsic dimensions),
 * which set `background-size: 0px 0px` — a real, invisible background,
 * not a missing one. The img's own load event isn't a DOM mutation, so
 * the MutationObserver driving re-scans elsewhere in this file would
 * never have naturally retried after that.
 *
 * Only marks `wrapper.dataset.tf2utilsEffectBg` once the background is
 * actually applied — confirmed live that a grid tile can be fully
 * resolved (effect name, id, <img>) while off the currently displayed
 * inventory page, still hitting the 0x0 case below. Marking it "done"
 * beforehand (as an earlier version did) meant that tile could never
 * be retried once the user paged to it.
 */
async function applyEffectBackground(wrapper, img, effectId) {
  const scale = await getEffectScale();

  const apply = () => {
    const wrapperRect = wrapper.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (imgRect.width === 0 || imgRect.height === 0) {
      if (!pendingVisibilityRetries.has(img)) {
        pendingVisibilityRetries.add(img);
        const observer = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          pendingVisibilityRetries.delete(img);
          apply();
        });
        observer.observe(img);
      }
      return;
    }

    const width = imgRect.width * scale;
    const height = imgRect.height * scale;
    const centerX = imgRect.left + imgRect.width / 2;
    const centerY = imgRect.top + imgRect.height / 2;

    wrapper.style.backgroundImage = `url(${particleUrl(effectId)})`;
    wrapper.style.backgroundSize = `${width}px ${height}px`;
    wrapper.style.backgroundPosition = `${centerX - width / 2 - wrapperRect.left}px ${centerY - height / 2 - wrapperRect.top}px`;
    wrapper.style.backgroundRepeat = "no-repeat";
    wrapper.dataset.tf2utilsEffectBg = "1";
  };

  if (img.complete && img.naturalWidth > 0) {
    apply();
  } else {
    img.addEventListener("load", apply, { once: true });
  }
}

/**
 * Main export — call once per page load, then again on every DOM
 * mutation of the panel (Steam re-renders it per item/price update,
 * same as itemLinks/itemDescriptionToggle). Always re-locates and
 * re-applies rather than tracking a "already done" marker — Steam can
 * replace the icon wrapper node on a later re-render, silently
 * dropping an inline style set on the old one, and re-running this is
 * cheap and idempotent either way.
 */
export function addUnusualEffectBackground() {
  if (!isTf2InventoryActive()) return false;

  applyGridCellBackgrounds().catch((err) => console.warn("[TF2TradingUtils] unusualEffectBackground: grid cell pass failed:", err));

  const picked = pickContainer();
  if (!picked) return false;

  const { container, title } = picked;
  const itemName = title.textContent.trim();
  if (!itemName) return false;
  if (!hasUnusualTag(container)) return false;

  const effectName = getEffectName(container);
  if (!effectName) {
    console.warn(`[TF2TradingUtils] unusualEffectBackground: "${itemName}" is Unusual but no "Unusual Effect: X" description line was found.`);
    return false;
  }

  const effectId = UnusualIds[effectName];
  if (effectId == null) {
    console.warn(`[TF2TradingUtils] unusualEffectBackground: effect name "${effectName}" not found in UnusualIds map.`);
    return false;
  }

  const iconEls = getIconElements(container, itemName);
  if (!iconEls) {
    console.warn(`[TF2TradingUtils] unusualEffectBackground: no <img alt="${itemName}"> found to anchor the background to.`);
    return false;
  }

  applyEffectBackground(iconEls.wrapper, iconEls.img, effectId)
    .catch((err) => console.warn("[TF2TradingUtils] unusualEffectBackground: failed to apply background:", err));
  return true;
}
