/**
@description: Function to route the pathname to the scripts
*/
function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);
  /* If there is the next in hostname, redirect to newUI scripts */
  loadSteamLinks();
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
