/**
 * Array object to contain information for the 4 buttons
 */
let ksInformation = [
  {
    label: "No Kit",
    urlCompletitionClassifieds: "&killstreak_tier=0",
    urlCompletitionStats: "",
    color: "#000000",
  },
  {
    label: "Normal KS",
    urlCompletitionClassifieds: "&killstreak_tier=1",
    urlCompletitionStats: "Killstreak ", // The final space is to join th %20 automatically
    color: "#5B6060",
  },
  {
    label: "Specialized KS",
    urlCompletitionClassifieds: "&killstreak_tier=2",
    urlCompletitionStats: "Specialized Killstreak ", // The final space is to join th %20 automatically
    color: "#68765C",
  },
  {
    label: "Professional KS",
    urlCompletitionClassifieds: "&killstreak_tier=3",
    urlCompletitionStats: "Professional Killstreak ", // The final space is to join th %20 automatically
    color: "#B15820",
  },
];

/**
 * Verifies which page it was loaded and redirects to the right function to generate the buttons
 *
 * @parameter url -> get the url of the current tab
 */
export function createKSButtons(locationURL) {
  const url = new URL(locationURL);

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
  const parts = url.pathname.split("/"); //Have the url pathname splitted
  const itemSeg = decodeURIComponent(parts[3] || "");

  // known prefixes
  const KS_PREFIXES = [
    "Killstreak ",
    "Specialized Killstreak ",
    "Professional Killstreak ",
  ];

  // find current prefix ("" if none)
  const currentPrefix = KS_PREFIXES.find((p) => itemSeg.startsWith(p)) || "";

  //Create the wrapper for all buttons and append all backpack.tf classes styles
  const divButtons = document.createElement("div");
  divButtons.classList.add(
    "btn-group",
    "btn-group-sm",
    "stats-killstreak-list"
  );

  /* MAKE THE SAME FUNCTION FOR ALL BUTTONS */
  ksInformation.forEach((ksInformation, index) => {
    const link = document.createElement("a"); //create the element
    link.type = "button";
    link.textContent = ksInformation.label;

    /* Add styling to the button */
    link.classList.add("btn", "btn-variety");

    /* verify if there is  */
    if ((ksInformation.urlCompletitionStats || "") === currentPrefix) {
      link.classList.add("active");
    }
    link.style.color = ksInformation.color; // Add text color

    /* Add linking */
    let newUrl = url;
    link.href = addKsURL(newUrl, ksInformation.urlCompletitionStats);

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
  ksInformation.forEach((ksInformation, i) => {
    const link = document.createElement("a");
    link.className = "btn btn-default";
    link.textContent = ksInformation.label;
    link.style.color = ksInformation.color;

    // keep all filters, just set killstreak_tier
    const p = new URLSearchParams(url.search);
    p.set(
      "killstreak_tier",
      ksInformation.urlCompletitionClassifieds.replace("&killstreak_tier=", "")
    );
    link.href = url.pathname + "?" + p.toString();

    // active state using page's class
    if (
      currentTier ===
      ksInformation.urlCompletitionClassifieds.replace("&killstreak_tier=", "")
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

/**
 * Insert or replace the Killstreak segment after /stats/{Quality}/
 * @param {URL|string} inputUrl
 * @param {string} ksSegment - e.g. "Killstreak", "Specialized Killstreak", "Professional Killstreak"
 * @returns {URL}
 */
function addKsURL(inputUrl, ksSegment) {
  const newUrl =
    inputUrl instanceof URL ? inputUrl : new URL(inputUrl, location.origin);
  const segsUrl = newUrl.pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent); // ['stats','Quality','Item','Tradable','Craftable']

  // 1) strip any existing KS prefix from the item name
  // matches: "Killstreak ", "Specialized Killstreak ", "Professional Killstreak " (case-insensitive)
  let itemName = segsUrl[2].replace(
    /^(?:Professional|Specialized)?\s*Killstreak\s+/i,
    ""
  );

  //Ensure it is in stats page and has a ksSegment from the object
  if (segsUrl[0] === "stats") {
    // 2) apply prefix (can be "", "Killstreak ", etc.)
    let prefix = ksSegment || ""; // accept "" as valid
    if (prefix && !prefix.endsWith(" ")) {
      prefix += " "; // ensure trailing space
    }

    segsUrl[2] = prefix + itemName;

    // Re-encode and rebuild the pathname
    newUrl.pathname = "/" + segsUrl.map(encodeURIComponent).join("/");
  }

  return newUrl;
}
