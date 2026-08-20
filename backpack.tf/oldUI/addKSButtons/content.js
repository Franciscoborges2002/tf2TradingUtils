import { KILLSTREAK_WEAPONS_SET } from "../../../utils/constants/killstreakWeapons.js";
import { KS_TIER_COLORS } from "../../../utils/constants/colors.js";
import { backpackStatsUrl } from "../../../utils/itemLinks.js";

const KS_PREFIXES = [
  "Killstreak ",
  "Specialized Killstreak ",
  "Professional Killstreak ",
];

/** Strips a killstreak-tier prefix, then an "Australium "/"Festive " prefix, leaving the bare weapon name to check against KILLSTREAK_WEAPONS_SET. */
function toBaseWeaponName(name) {
  const prefix = KS_PREFIXES.find((p) => name.startsWith(p));
  let stripped = prefix ? name.slice(prefix.length) : name;
  if (stripped.startsWith("Australium ")) stripped = stripped.slice("Australium ".length);
  if (stripped.startsWith("Festive ")) stripped = stripped.slice("Festive ".length);
  return stripped;
}

/** Extracts the bare weapon name shown on a /stats or /classifieds page, for the KILLSTREAK_WEAPONS_SET check. */
function getBaseWeaponName(url) {
  if (url.pathname.includes("stats")) {
    const parts = url.pathname.split("/");
    const itemSeg = decodeURIComponent(parts[3] || "");
    return toBaseWeaponName(itemSeg);
  }
  if (url.pathname.includes("classifieds")) {
    const item = url.searchParams.get("item");
    return item ? toBaseWeaponName(item) : null;
  }
  return null;
}

/**
 * Array object to contain information for the 4 buttons
 */
let ksInformation = [
  {
    label: "No Kit",
    urlCompletitionClassifieds: "&killstreak_tier=0",
    urlCompletitionStats: "",
    color: KS_TIER_COLORS.none,
  },
  {
    label: "Normal KS",
    urlCompletitionClassifieds: "&killstreak_tier=1",
    urlCompletitionStats: "Killstreak ", // The final space is to join th %20 automatically
    color: KS_TIER_COLORS.killstreak,
  },
  {
    label: "Specialized KS",
    urlCompletitionClassifieds: "&killstreak_tier=2",
    urlCompletitionStats: "Specialized Killstreak ", // The final space is to join th %20 automatically
    color: KS_TIER_COLORS.specialized,
  },
  {
    label: "Professional KS",
    urlCompletitionClassifieds: "&killstreak_tier=3",
    urlCompletitionStats: "Professional Killstreak ", // The final space is to join th %20 automatically
    color: KS_TIER_COLORS.professional,
  },
];

/**
 * Verifies which page it was loaded and redirects to the right function to generate the buttons
 *
 * @parameter url -> get the url of the current tab
 */
export function createKSButtons(locationURL) {
  const url = new URL(locationURL);

  // "My Listings" (/classifieds?steamid=...) and "Archived Listings"
  // (/classifieds/archive) both list many different items at once —
  // a killstreak-tier filter for a single item doesn't belong there.
  // Skip both for now (relist / initial-listing pages still TODO).
  if (url.pathname.includes("classifieds")) {
    const isArchive = url.pathname.includes("/classifieds/archive");
    const isMyListings = url.searchParams.has("steamid");
    if (isArchive || isMyListings) return;
  }

  // Only weapons that actually have a Killstreak Kit / Kit Fabricator
  // in the game get the buttons — cosmetics, keys, metal, etc. can't
  // be killstreak-ified at all.
  const weaponName = getBaseWeaponName(url);
  if (!weaponName || !KILLSTREAK_WEAPONS_SET.has(weaponName)) return;

  //Redirect to the different functions
  if (url.pathname.includes("stats")) {
    createButtonsStats(url);
  } else if (url.pathname.includes("classifieds")) {
    createButtonsClassifieds(url);
  }
}

/**
 * Function that creates the buttons for the /stats page
 *
 * @parameter url -> get the url of the current tab
 *
 * @returns nothing
 */
function createButtonsStats(url) {
  const headerControls = document.getElementsByClassName(
    "stats-header-controls"
  );
  const parentHead = headerControls[0];
  const firstDiv = parentHead.querySelector("div"); //Quality div

  // ['', 'stats', Quality, Item, 'Tradable', 'Craftable'|'Non-Craftable', EffectId?]
  const parts = url.pathname.split("/").map(decodeURIComponent);
  const quality = parts[2];
  const itemSeg = parts[3] || "";
  const craftable = parts[5] !== "Non-Craftable";
  const effectId = parts[6];

  // find current prefix ("" if none)
  const currentPrefix = KS_PREFIXES.find((p) => itemSeg.startsWith(p)) || "";
  const baseItemName = itemSeg.slice(currentPrefix.length);

  //Create the wrapper for all buttons and append all backpack.tf classes styles
  const divButtons = document.createElement("div");
  divButtons.classList.add(
    "btn-group",
    "btn-group-sm",
    "stats-killstreak-list"
  );

  /* MAKE THE SAME FUNCTION FOR ALL BUTTONS */
  ksInformation.forEach((info) => {
    const link = document.createElement("a"); //create the element
    link.type = "button";
    link.textContent = info.label;

    /* Add styling to the button */
    link.classList.add("btn", "btn-variety");

    /* verify if there is  */
    if ((info.urlCompletitionStats || "") === currentPrefix) {
      link.classList.add("active");
    }
    link.style.color = info.color; // Add text color

    /* Add linking — classic backpack.tf/stats has no separate
       killstreak-tier field, so the tier prefix is baked into name */
    link.href = backpackStatsUrl((info.urlCompletitionStats || "") + baseItemName, quality, { craftable, effectId });

    /* Append to the overall div of the buttons */
    divButtons.appendChild(link);
  });

  if (firstDiv && firstDiv.nextSibling) {
    parentHead.insertBefore(divButtons, firstDiv.nextSibling);
    parentHead.insertBefore(document.createElement("br"), firstDiv.nextSibling);
  } else {
    // if there's no sibling, just append at the end
    parentHead.appendChild(divButtons);
  }
}

/**
 * Function that creates the buttons for the /stats page
 *
 * @parameter url -> get the url of the current tab
 */
function createButtonsClassifieds(url) {
  /* Get the location to insert the content */
  const panelBody = document.querySelector(".panel.panel-main .panel-body");
  if (!panelBody) return;

  /* avoid duplicate nav */
  if (document.getElementById("ks-tier-nav")) return;

  const newUrl = new URL(url);
  const params = new URLSearchParams(newUrl.search);
  const currentTier = params.get("killstreak_tier") || "0";

  /* create the wrapper */
  const navWrap = document.createElement("div");
  navWrap.id = "ks-tier-nav";
  navWrap.classList.add("btn-group", "btn-group-sm")
  navWrap.style.padding = "8px 0px"

  /* MAKE THE SAME FUNCTION FOR ALL BUTTONS */
  ksInformation.forEach((info, i) => {
    const link = document.createElement("a");
    link.className = "btn btn-default";
    link.textContent = info.label;
    link.style.color = info.color;

    // keep all filters, just set killstreak_tier — and reset back to
    // page 1, since switching tier changes the result set and the old
    // page number may no longer exist in it
    const p = new URLSearchParams(url.search);
    p.set(
      "killstreak_tier",
      info.urlCompletitionClassifieds.replace("&killstreak_tier=", "")
    );
    p.set("page", "1");
    link.href = url.pathname + "?" + p.toString();

    // active state using page's class
    if (
      currentTier ===
      info.urlCompletitionClassifieds.replace("&killstreak_tier=", "")
    ) {
      link.classList.add("active");
    }

    // rounded edges
    if (i === 0) link.style.borderRadius = "5px 0 0 5px";
    if (i === ksInformation.length - 1) link.style.borderRadius = "0 5px 5px 0";

    navWrap.appendChild(link);
  });

  const crumbs = panelBody.querySelector("#search-crumbs");
  if (crumbs) {
    crumbs.insertAdjacentElement("afterend", navWrap);
  } else {
    panelBody.prepend(navWrap);
  }
}
