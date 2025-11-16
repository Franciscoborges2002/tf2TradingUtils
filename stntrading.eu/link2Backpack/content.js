const ITEMS_QUALITY = ["Unique", "Strange", "Vintage", "Haunted", "Unusual"];
const ITEMS_CRAFTABILITY = ["Craftable", "Non-Craftable"];
const baseBpUrl = "https://backpack.tf/stats";
const baseNextBpUrl = "https://next.backpack.tf/stats";
/**
 * Function to redirect the user to the backapck stats page of an item
 */
export function link2Backpack() {
  let itemName = document.querySelector("h1").innerHTML; //Get the name of the item
  /* unusual not supported yet */
  if (itemName.includes(ITEMS_QUALITY[4])) {
    console.log("[TF2TradingUtils] not supported yet.");
    return;
  }
  let placeAddLink = document.getElementsByClassName("card-body")[1]; //place for were i want to add the button in the actual page

  let linkBp = document.createElement("a"); //create the link
  let linkNextBp = document.createElement("a"); //create the link

  linkBp.textContent = "bp.tf stats"; //Add the text
  linkNextBp.textContent = "next.bp.tf stats"; //Add the text
  linkBp.target = "_blank";
  linkNextBp.target = "_blank";

  linkBp.classList.add("btn");
  linkBp.classList.add("btn-secondary");
  linkNextBp.classList.add("btn");
  linkNextBp.classList.add("btn-secondary");

  let link2RedirectBp = createBpStatsLink(itemName, false);
  let link2RedirectNextBp = createBpStatsLink(itemName, true);

  linkBp.href = link2RedirectBp;
  linkNextBp.href = link2RedirectNextBp;

  placeAddLink.appendChild(linkBp); //append the button to the page
  placeAddLink.appendChild(linkNextBp); //append the button to the page
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
