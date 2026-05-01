/* 
File for routing the scripts for steamcommunity.com tradeoffers based
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

  bots = await loadBotDb();
  
  if (
    url.pathname.includes("tradeoffer") ||
    url.pathname.includes("tradeoffers")
  ) {
    loadShowTradeDetails();
    EXT_SCRIPT_INFO.scripts.push([
      "Show Denominations",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/showTradeDetails",
    ]);

    loadPartnerLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "Partner Links",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/partnerLinks",
    ]);

    loadBotRep(bots);
    EXT_SCRIPT_INFO.scripts.push([
      "Bots Trust",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/",
    ]);

/*     loadAddCurrency();
    EXT_SCRIPT_INFO.scripts.push([
      "Add Currency",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/addCurrency",
    ]); */
  }
  /* If there is the next in hostname, redirect to newUI scripts */
}

//Start the script
scriptRouter();

/* 
Utility function to load the denomination summary script
*/
function loadShowTradeDetails() {
  (async () => {
    const { showTradeDetails } = await import(
      chrome.runtime.getURL("steamTradeOffer/showTradeDetails/content.js")
    );
    showTradeDetails();
  })();
}
 
/* 
Utility funtions to load scripts
*/
function loadPartnerLinks() {
  (async () => {
    // Load module dynamically
    const { showPartnerLinks } = await import(
      chrome.runtime.getURL("steamTradeOffer/partnerLinks/content.js")
    );

    showPartnerLinks();
  })();
}

/* function loadAddCurrency() {
  (async () => {
    const { addCurrency } = await import(
      chrome.runtime.getURL("steamTradeOffer/addCurrency/content.js")
    );
    addCurrency();
  })();
} */

/* 
Utility funtions to load scripts
*/
function loadBotRep(bots) {
  (async () => {
    // Load module dynamically
    const { showBotRepTrade } = await import(
      chrome.runtime.getURL("steamTradeOffer/botRep/content.js")
    );

    showBotRepTrade(bots);
  })();
}

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
