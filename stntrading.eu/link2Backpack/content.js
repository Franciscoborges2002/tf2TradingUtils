const ITEMS_QUALITY = ["Unique", "Strange", "Vintage", "Haunted", "Unusual"];
const ITEMS_CRAFTABILITY = ["Craftable", "Non-Craftable"];
const baseBpUrl = "https://backpack.tf/stats";
const baseNextBpUrl = "https://next.backpack.tf/stats";
let effectsDataPromise = null; //to get the utils effects ids
/**
 * Function to redirect the user to the backapck stats page of an item
 */
export async function link2Backpack() {
  const itemName = document.querySelector("h1").innerHTML; //Get the name of the item
  const placeAddLink = document.getElementsByClassName("card-body")[1]; //place for were i want to add the button in the actual page

  const linkBp = document.createElement("a"); //create the link
  const linkNextBp = document.createElement("a"); //create the link

  linkBp.textContent = "bp.tf stats"; //Add the text
  linkNextBp.textContent = "next.bp.tf stats"; //Add the text
  linkBp.target = "_blank";
  linkNextBp.target = "_blank";

  linkBp.classList.add("btn");
  linkBp.classList.add("btn-secondary");
  linkNextBp.classList.add("btn");
  linkNextBp.classList.add("btn-secondary");

  let link2RedirectBp = "";
  let link2RedirectNextBp = "";

  /* unusual not supported yet */
  if (itemName.includes(ITEMS_QUALITY[4])) {
    link2RedirectBp = await createBpStatsLinkUnusual(itemName, false);
    link2RedirectNextBp = await createBpStatsLinkUnusual(itemName, true);
  } else {
    link2RedirectBp = createBpStatsLink(itemName, false);
    link2RedirectNextBp = createBpStatsLink(itemName, true);
  }

  if (link2RedirectBp) {
    linkBp.href = link2RedirectBp;
    placeAddLink.appendChild(linkBp); //append the button to the page
  }

  if (link2RedirectNextBp) {
    linkNextBp.href = link2RedirectNextBp;
    placeAddLink.appendChild(linkNextBp); //append the button to the page
  }
  return;
}

/**
 * Build a backpack.tf stats URL for an item.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} useNext - true → use next.backpack.tf, false → use backpack.tf
 * @returns {string} URL
 */
function createBpStatsLink(itemNameRaw, useNext = false) {
  let name = String(itemNameRaw || "").trim();

  // detect craftability
  const isNonCraftable = name.includes(ITEMS_CRAFTABILITY[1]);

  // remove "The " at start
  if (name.startsWith("The ")) name = name.slice(4);

  // detect quality, default Unique
  let matchedQuality = "Unique";
  for (const q of ITEMS_QUALITY) {
    if (name.startsWith(q + " ")) {
      matchedQuality = q;
      name = name.slice((q + " ").length); // strip quality prefix
      break;
    }
  }

  // strip craftability prefix if present
  if (isNonCraftable) {
    name = name.replace(ITEMS_CRAFTABILITY[1] + " ", "").trim();
  }

  // encode item name
  const encodedName = encodeURIComponent(name);

  // choose base
  const base = useNext ? baseNextBpUrl : baseBpUrl;

  return `${base}/${matchedQuality}/${encodedName}/Tradable/${
    isNonCraftable ? "Non-Craftable" : "Craftable"
  }`;
}

/**
 * Build a backpack.tf stats URL for an item.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} useNext - true → use next.backpack.tf, false → use backpack.tf
 * @returns {string} URL
 */
async function createBpStatsLinkUnusual(itemNameRaw, useNext = false) {
  const effectData = await getEffectsData(); // dynamic load here

  // effectData should be an object like:
  // { "32": { "name": "Orbiting Planets", "id": "32" }, ... }

  const entries = Object.values(effectData);
  const lowerName = itemNameRaw.toLowerCase();

  // 1) Find the effect whose name is contained in the item name
  const effect = entries.find((e) => lowerName.includes(e.name.toLowerCase()));

  //No effect found, return
  if (!effect) {
    console.log("[TF2TradingUtils] Effect not found");
    return null;
  }

  // 2) Remove "Unusual" and the effect name from the original name
  let baseName = itemNameRaw;
  baseName = baseName.replace(/^Unusual\s+/i, ""); // Remove leading "Unusual "
  const effectNameRegex = new RegExp(effect.name, "i");
  baseName = baseName.replace(effectNameRegex, "").trim(); // Remove the effect name (case-insensitive, once)
  baseName = baseName.replace(/^[-,\s]+/, "").trim(); // Clean commas/extra spaces from the start

  // 3) URL-encode the remaining hat name
  const encodedName = encodeURIComponent(baseName);

  // choose base
  const base = useNext ? baseNextBpUrl : baseBpUrl;

  return `${base}/Unusual/${encodedName}/Tradable/Craftable/${effect.id}`;
}

// Load and cache the JSON dynamically
async function getEffectsData() {
  if (!effectsDataPromise) {
    effectsDataPromise = fetch(
      chrome.runtime.getURL("utils/backpackUnusualsIds.json")
    ).then((res) => res.json());
  }
  return effectsDataPromise;
}
