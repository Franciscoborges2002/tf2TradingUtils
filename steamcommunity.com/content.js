/* 
File for routing the scripts for steamcommunity.com based
on the hostname and pathaname the user is in
*/

// Var to be able to present the scripts loaded in popup
const EXT_SCRIPT_INFO = {
  site: window.location.hostname,
  scripts: [],
};

/**
@description: Function to route the pathname to the scripts
*/
async function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);

  if(url.pathname.includes("inventory")){
    loadItemLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "itemLinks",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/itemLinks",
    ]);
  }

  if(url.pathname.includes("profile") || url.pathname.includes("id")){
  bots = await loadBotDb();
  console.log(bots);
  /* If there is the next in hostname, redirect to newUI scripts */
  loadSteamLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "loadSteamLinks",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/steamLinks",
    ]);
    loadBotRep(bots);
    EXT_SCRIPT_INFO.scripts.push([
      "botRep",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/botRep",
    ]);
  }
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadSteamLinks() {
  (async () => {
    // Load module dynamically
    const { steamLinks } = await import(
      chrome.runtime.getURL("steamcommunity.com/steamLinks/content.js")
    );

    steamLinks();
  })();
}

function loadBotRep(bots) {
  (async () => {
    // Load module dynamically
    const { showBotRepProfile } = await import(
      chrome.runtime.getURL("steamcommunity.com/botRep/content.js")
    );

    showBotRepProfile(bots);
  })();
}

function loadItemLinks() {
  (async () => {
    // Load module dynamically
    const { showItemLinks } = await import(
      chrome.runtime.getURL("steamcommunity.com/itemLinks/content.js")
    );

    showItemLinks();

    const target = document.querySelector("#iteminfo0") ||
                   document.querySelector("#iteminfo1") ||
                   document.body;

    new MutationObserver(() => showItemLinks())
      .observe(target, { childList: true, subtree: true });
  })();
}

// Small helper so it works in Chrome + Firefox
const api = typeof browser !== "undefined" ? browser : chrome;

// Load bot DB JSON from extension package
async function loadBotDb() {
  try {
    return await fetch(
      "https://raw.githubusercontent.com/Franciscoborges2002/tf2TradingUtils/refs/heads/main/utils/data/trustedBots.json"
    ).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch bots info");
      return res.json();
    });
  } catch {
    console.warn("[TF2TradingUtils]: Bot list failed to fetch");
  }
}

/* 
Listener to respond to the call of the popup, to now which scripts were loaded
*/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_LOADED_SCRIPTS") {
    sendResponse(EXT_SCRIPT_INFO);
    return true;
  }
});
