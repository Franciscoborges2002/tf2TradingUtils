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
function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);
  if (
    url.pathname.includes("tradeoffer") ||
    url.pathname.includes("tradeoffers")
  ) {
    //loadShowDenominations();
    loadPartnerLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "Partner Links",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamTradeOffer/partnerLinks",
    ]);
  }
  /* If there is the next in hostname, redirect to newUI scripts */
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
/* function loadShowDenominations() {
  (async () => {
    // Load module dynamically
    const { showDenominationsUsers } = await import(
      chrome.runtime.getURL("steamTradeHelper/showDenominations/content.js")
    );

    showDenominationsUsers();
  })();
} */

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

/* 
Listener to respond to the call of the popup, to now which scripts were loaded
*/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_LOADED_SCRIPTS") {
    sendResponse(EXT_SCRIPT_INFO);
    return true;
  }
});
