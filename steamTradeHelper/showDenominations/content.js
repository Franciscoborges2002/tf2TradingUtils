const getLocationToAppend = document.getElementById(
  "inventory_displaycontrols"
); //To get the place where im going to append the stuff

const TF2_APPID = 440;
const TF2_CTXID = 2;
const INV_SELECTOR =
  'div[id^="inventory_"][id$="_440_2"] .item.app440.context2';

/**
 * Scan the partner's TF2 inventory currently loaded in the DOM and show metal counts.
 * Counts: Scrap Metal, Reclaimed Metal, Refined Metal.
 * Also shows "refined equivalent" (9 scrap = 1 ref, 3 scrap = 1 rec).
 */
function getPure() {
  // loop through each user's TF2 inventory container
  const invContainers = document.querySelectorAll(
    'div[id^="inventory_"][id$="_440_2"]'
  );

  console.warn(
    "[TF2] No TF2 inventory containers found (inventory_*_440_2). Open each user's TF2 tab."
  );

  invContainers.forEach((inv) => {
    const steamid = inv.id.split("_")[1] || "unknown";
    const tiles = inv.querySelectorAll(".item.app440.context2"); // robust: no dependence on .inventory_page/.itemHolder

    console.log(tiles)

    console.log(
      `[TF2] Scanning ${tiles.length} tiles for inventory ${steamid}...`
    );

    tiles.forEach((itemEl) => {
      const name = getItemNameFromTile(itemEl);
      /* console.log(name); */
      if (!name) {
        /* console.log("no name"); */
        return;
      }

      /* console.log(name); */ // all names

      if (isRefinedMetalName(name)) {
        console.log("Refined Metal found:", itemEl.id);
      }
    });
  });
}

/**
 * Function that starts all script
 */
export async function showDenominationsUsers({
  interval = 500,
  maxTries = 40,
} = {}) {
  // wait until any TF2 item tiles are present in THIS frame
  //document.addEventListener("DOMContentLoaded", getPure());
  let tries = 0;
  const timer = setInterval(() => {
    if (document.querySelector(INV_SELECTOR)) {
      clearInterval(timer);
      try {
        getPure();
      } catch (e) {
        console.warn("mainFn error:", e);
      }
    } else if (++tries >= maxTries) {
      clearInterval(timer);
      console.warn("Inventory not found in time.");
    }
  }, interval);
}

/**
 * Get the display name (e.g., "Refined Metal") from a .item element.
 * @param {HTMLElement} itemEl - e.g., <div class="item app440 context2" id="item440_2_16051510830">
 * @returns {string|null}
 */
function getItemNameFromTile(itemEl) {
  console.log(itemEl)
  if (!itemEl) return null;

  // 1) Easiest: Steam often attaches rgItem
  if (itemEl.rgItem) {
    const n = itemEl.rgItem.market_hash_name || itemEl.rgItem.name;
    if (n) return String(n).trim();
  }

  // Parse app/context/asset from element id: "item440_2_<assetid>"
  const m = /^item(\d+)_(\d+)_(\d+)$/.exec(itemEl.id || "");
  if (!m) return fallbackName(itemEl);
  const appid = Number(m[1]);
  const contextid = Number(m[2]);
  const assetid = String(m[3]); // IMPORTANT: Steam maps use string keys

  // 2) Figure out whose inventory this tile belongs to from its container
  const invContainer = itemEl.closest('div[id^="inventory_"][id$="_440_2"]');
  const steamid = invContainer ? invContainer.id.split("_")[1] : null;

  // 3) Resolve inventory object (UserYou or UserThem) for TF2 (440/2)
  let invObj = null;
  try {
    if (typeof UserYou !== "undefined" && steamid && String(steamid) === String(window.g_steamID)) {
      invObj = UserYou.GetInventory(appid, contextid);
    } else if (typeof UserThem !== "undefined" && steamid && String(steamid) === String(window.g_steamIDTradePartner)) {
      invObj = UserThem.GetInventory(appid, contextid);
    }
  } catch {}

  // 3a) Fallback to the currently active inventory, if any
  if (!invObj && window.g_ActiveInventory && g_ActiveInventory.m_rgAssets) {
    invObj = g_ActiveInventory;
  }

  // 4) Look up asset & description (keys are strings)
  if (invObj) {
    try {
      const asset =
        (invObj.GetAsset && invObj.GetAsset(assetid)) ||
        (invObj.m_rgAssets && invObj.m_rgAssets[assetid]) ||
        null;

      if (asset) {
        const classid = String(asset.classid || "");
        const instanceid = String(asset.instanceid || "0");
        const descKey = `${classid}_${instanceid}`;

        const desc =
          (invObj.GetDescription && invObj.GetDescription(appid, classid, instanceid)) ||
          (invObj.m_rgDescriptions && invObj.m_rgDescriptions[descKey]) ||
          null;

        const name =
          (desc && (desc.market_hash_name || desc.name)) ||
          asset.market_hash_name ||
          asset.name;

        if (name) return String(name).trim();
      }
    } catch (e) {
      // ignore and try fallbacks
    }
  }

  // 5) Fallbacks from DOM attributes/embedded JSON
  return fallbackName(itemEl);

  function fallbackName(el) {
    // data-economy-item JSON
    const raw = el.getAttribute && el.getAttribute("data-economy-item");
    if (raw) {
      try {
        const d = JSON.parse(raw);
        const n = d.market_hash_name || d.name;
        if (n) return String(n).trim();
      } catch {}
    }
    // plain attributes
    const n =
      (el.getAttribute && (el.getAttribute("data-item-name") || el.getAttribute("title") || el.getAttribute("aria-label"))) ||
      "";
    return n ? String(n).trim() : null;
  }
}