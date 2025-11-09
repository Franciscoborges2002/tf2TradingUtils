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
function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);
  /* If there is the next in hostname, redirect to newUI scripts */
  loadSteamLinks();
  EXT_SCRIPT_INFO.scripts.push("loadSteamLinks");
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadSteamLinks() {
  (async () => {
    // Load module dynamically
    const { showUsefullLinks } = await import(
      chrome.runtime.getURL("steamcommunity.com/steamLinks/content.js")
    );

    showUsefullLinks();
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