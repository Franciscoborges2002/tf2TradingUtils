/**
@description: Function to route the pathname to the scripts
*/
function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);
  /* if(url.pathname.includes("tradeoffer") || url.pathname.includes("tradeoffers")){
    loadShowDenominations();
  } */
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
