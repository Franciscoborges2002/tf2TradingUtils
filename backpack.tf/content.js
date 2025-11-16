/* 
File for routing the scripts for backpack.tf based
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
  if(url.hostname.includes("forums")){
    return;
  }

  /* If there is the next in hostname, redirect to newUI scripts */
  if (url.hostname.includes("next")) {
    /* start scripts for newUI */
  } else {
    /* start scripts for oldUI */
    //createKSButtons(url);
    loadAddKSButtons(url)
    EXT_SCRIPT_INFO.scripts.push("Killstreak Buttons");
  }
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadAddKSButtons(url) {
  (async () => {
    // Load module dynamically
    const { createKSButtons } = await import(
      chrome.runtime.getURL("backpack.tf/oldUI/addKSButtons/content.js")
    );

    createKSButtons(url);
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