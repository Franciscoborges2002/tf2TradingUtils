import { backpackStatsUrl, mannCoStoreUrl, marketplaceTfUrl } from "../../utils/itemLinks.js";

const ITEMS_QUALITY = ["Unique", "Strange", "Vintage", "Haunted", "Unusual"];
const ITEMS_CRAFTABILITY = ["Craftable", "Non-Craftable"];
let effectsDataPromise = null; //to get the utils effects ids
/**
 * Function to redirect the user to the backapck stats page of an item
 */
export async function link2Backpack() {
  const itemName = document.querySelector("h1").innerHTML; //Get the name of the item
  const placeAddLink = document.getElementsByClassName("card-body")[1]; //place for were i want to add the button in the actual page

  const linkBp = document.createElement("a"); //create the link
  const linkNextBp = document.createElement("a"); //create the link
  const linkMannco = document.createElement("a"); //create the link — mannco.store, added as a test
  const linkMarketplace = document.createElement("a"); //create the link — marketplace.tf, added as a test

  linkBp.textContent = "bp.tf stats"; //Add the text
  linkNextBp.textContent = "next.bp.tf stats"; //Add the text
  linkMannco.textContent = "mannco.store"; //Add the text
  linkMarketplace.textContent = "marketplace.tf"; //Add the text
  linkBp.target = "_blank";
  linkNextBp.target = "_blank";
  linkMannco.target = "_blank";
  linkMarketplace.target = "_blank";

  linkBp.classList.add("btn");
  linkBp.classList.add("btn-secondary");
  linkNextBp.classList.add("btn");
  linkNextBp.classList.add("btn-secondary");
  linkMannco.classList.add("btn");
  linkMannco.classList.add("btn-secondary");
  linkMarketplace.classList.add("btn");
  linkMarketplace.classList.add("btn-secondary");

  let link2RedirectBp = "";
  let link2RedirectNextBp = "";
  let link2RedirectMannco = "";
  let link2RedirectMarketplace = "";

  /* unusual not supported yet */
  if (itemName.includes(ITEMS_QUALITY[4])) {
    link2RedirectBp = await createBpStatsLinkUnusual(itemName, false);
    link2RedirectNextBp = await createBpStatsLinkUnusual(itemName, true);
    link2RedirectMannco = await createManncoLink(itemName);
  } else {
    link2RedirectBp = createBpStatsLink(itemName, false);
    link2RedirectNextBp = createBpStatsLink(itemName, true);
    link2RedirectMannco = createManncoLink(itemName);
  }
  link2RedirectMarketplace = await createMarketplaceLink(itemName);

  if (link2RedirectBp) {
    linkBp.href = link2RedirectBp;
    placeAddLink.appendChild(linkBp); //append the button to the page
  }

  if (link2RedirectNextBp) {
    linkNextBp.href = link2RedirectNextBp;
    placeAddLink.appendChild(linkNextBp); //append the button to the page
  }

  if (link2RedirectMannco) {
    linkMannco.href = link2RedirectMannco;
    placeAddLink.appendChild(linkMannco); //append the button to the page
  }

  if (link2RedirectMarketplace) {
    linkMarketplace.href = link2RedirectMarketplace;
    placeAddLink.appendChild(linkMarketplace); //append the button to the page
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

  return backpackStatsUrl({
    name,
    quality: matchedQuality,
    craftable: !isNonCraftable,
    next: useNext,
  });
}

/**
 * Finds the Unusual effect whose name appears in the item's name.
 * @param {string} itemNameRaw
 * @returns {Promise<{name: string, id: string}|null>}
 */
async function findUnusualEffect(itemNameRaw) {
  const effectData = await getEffectsData(); // dynamic load here

  // effectData should be an object like:
  // { "32": { "name": "Orbiting Planets", "id": "32" }, ... }

  const entries = Object.values(effectData);
  const lowerName = itemNameRaw.toLowerCase();

  return entries.find((e) => lowerName.includes(e.name.toLowerCase())) ?? null;
}

/** Strips the leading "Unusual " and the effect name out of an Unusual item's full name. */
function stripUnusualEffectName(itemNameRaw, effectName) {
  let baseName = itemNameRaw;
  baseName = baseName.replace(/^Unusual\s+/i, ""); // Remove leading "Unusual "
  const effectNameRegex = new RegExp(effectName, "i");
  baseName = baseName.replace(effectNameRegex, "").trim(); // Remove the effect name (case-insensitive, once)
  baseName = baseName.replace(/^[-,\s]+/, "").trim(); // Clean commas/extra spaces from the start
  return baseName;
}

/**
 * Build a backpack.tf stats URL for an item.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @param {boolean} useNext - true → use next.backpack.tf, false → use backpack.tf
 * @returns {string} URL
 */
async function createBpStatsLinkUnusual(itemNameRaw, useNext = false) {
  const effect = await findUnusualEffect(itemNameRaw);

  //No effect found, return
  if (!effect) {
    console.log("[TF2TradingUtils] Effect not found");
    return null;
  }

  const baseName = stripUnusualEffectName(itemNameRaw, effect.name);

  return backpackStatsUrl({
    name: baseName,
    quality: "Unusual",
    craftable: true,
    effectId: effect.id,
    next: useNext,
  });
}

/**
 * Build a mannco.store item URL — added as a test of the shared
 * mannCoStoreUrl() builder, alongside the existing backpack.tf links.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<string>|string} URL
 */
function createManncoLink(itemNameRaw) {
  let name = String(itemNameRaw || "").trim();

  if (name.includes(ITEMS_QUALITY[4])) {
    // Unusual — mannco.store wants the effect name prepended, which
    // Steam's own item name never includes.
    return findUnusualEffect(name).then((effect) => {
      if (!effect) return "";
      const baseName = stripUnusualEffectName(name, effect.name);
      return mannCoStoreUrl({ name: `Unusual ${baseName}`, effectName: effect.name });
    });
  }

  // "Non-Craftable " (if present) is kept as-is — mannCoStoreUrl()
  // turns it into mannco.store's "uncraftable" slug word.
  return mannCoStoreUrl({ name });
}

/**
 * Parses an item's full name down to the bare schema name (no quality,
 * no "The ", no killstreak/Australium/Festive/Non-Craftable text — all
 * those become separate fields) plus the attributes marketplace.tf's
 * sku needs.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier?: number, australium?: boolean, festive?: boolean, effectId?: string}|null>}
 */
async function parseItemAttributes(itemNameRaw) {
  let name = String(itemNameRaw || "").trim();

  // detect + strip craftability
  const isNonCraftable = name.includes(ITEMS_CRAFTABILITY[1]);
  if (isNonCraftable) {
    name = name.replace(ITEMS_CRAFTABILITY[1] + " ", "").trim();
  }

  // remove "The " at start — the schema's own item_name never has it
  if (name.startsWith("The ")) name = name.slice(4);

  // detect + strip quality, default Unique
  let matchedQuality = "Unique";
  for (const q of ITEMS_QUALITY) {
    if (name.startsWith(q + " ")) {
      matchedQuality = q;
      name = name.slice((q + " ").length);
      break;
    }
  }

  if (matchedQuality === "Unusual") {
    const effect = await findUnusualEffect(itemNameRaw);
    if (!effect) return null;
    const baseName = stripUnusualEffectName(name, effect.name);
    return { name: baseName, quality: "Unusual", craftable: !isNonCraftable, effectId: effect.id };
  }

  // detect + strip killstreak tier — schema's item_name doesn't include it
  let ksTier;
  if (name.startsWith("Professional Killstreak ")) {
    ksTier = 3;
    name = name.slice("Professional Killstreak ".length);
  } else if (name.startsWith("Specialized Killstreak ")) {
    ksTier = 2;
    name = name.slice("Specialized Killstreak ".length);
  } else if (name.startsWith("Killstreak ")) {
    ksTier = 1;
    name = name.slice("Killstreak ".length);
  }

  // detect + strip Australium/Festive — also separate sku fields
  const australium = name.startsWith("Australium ");
  if (australium) name = name.slice("Australium ".length);

  const festive = name.startsWith("Festive ");
  if (festive) name = name.slice("Festive ".length);

  return { name, quality: matchedQuality, craftable: !isNonCraftable, ksTier, australium, festive };
}

/**
 * Build a marketplace.tf item URL — added as a test of the shared
 * marketplaceTfUrl() builder.
 *
 * @param {string} itemNameRaw - e.g., "Vintage The Max's Severed Head"
 * @returns {Promise<string|null>}
 */
async function createMarketplaceLink(itemNameRaw) {
  const attrs = await parseItemAttributes(itemNameRaw);
  if (!attrs) return null;
  return marketplaceTfUrl(attrs);
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
