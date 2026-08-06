/* 
File for routing the scripts for stntrading.eu based
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
  /* If there is the next in hostname, redirect to newUI scripts */
  if (url.pathname.includes("unusual")) {
    /* start scripts for unusual page */
  }

  if (url.pathname.includes("item") && url.pathname.includes("tf2")) {
    /* start scripts for normal item page */
    loadItemLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "itemLinks",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/stntrading.eu/itemLinks",
    ]);

    loadCopyClipboard();
    EXT_SCRIPT_INFO.scripts.push([
      "Copy to clipboard",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/stntrading.eu/copyClipboard",
    ]);
  }

  /* Start all pages script */
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadCopyClipboard() {
  (async () => {
    // Load module dynamically
    const { copyNameClipboard } = await import(
      chrome.runtime.getURL("stntrading.eu/copyClipboard/content.js")
    );

    copyNameClipboard();
  })();
}

function loadItemLinks() {
  (async () => {
    // Load module dynamically
    const { showItemLinks } = await import(
      chrome.runtime.getURL("stntrading.eu/itemLinks/content.js")
    );

    showItemLinks();
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
