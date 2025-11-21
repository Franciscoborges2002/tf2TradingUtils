/* 
File for routing the scripts for scrap.tf based
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
  /* Dont load scripts for the forums subdomain */
  if(url.hostname.includes("merch")){
    return;
  }

  if (url.pathname.includes("items")) {
    /* start scripts for normal item page */
    loadScrapItemsTableLinks();
    EXT_SCRIPT_INFO.scripts.push("Scrap Items Table List");
  }

  /* Start all pages script */
  loadHoverItemLinks();
  EXT_SCRIPT_INFO.scripts.push("Hover Item Links");
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadScrapItemsTableLinks() {
  (async () => {
    // Load module dynamically
    const { scrapItemsTableLinks } = await import(
      chrome.runtime.getURL("scrap.tf/scrapItemsTableLinks/content.js")
    );

    scrapItemsTableLinks();
  })();
}

/* 
Utility funtions to load scripts
*/
function loadHoverItemLinks() {
  (async () => {
    // Load module dynamically
    const { scrapHoverItemLinks } = await import(
      chrome.runtime.getURL("scrap.tf/scrapHoverItemLinks/content.js")
    );

    scrapHoverItemLinks();
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
