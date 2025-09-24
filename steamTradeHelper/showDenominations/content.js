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