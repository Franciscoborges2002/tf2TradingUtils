/* 
File for routing the scripts for backpack.tf based
on the hostname and pathaname the user is in
*/
//import { createKSButtons } from "./oldUI/addKSButton/content.js";

/**
@description: Function to route the pathname to the scripts
*/
function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);
  /* If there is the next in hostname, redirect to newUI scripts */
  if (url.hostname.includes("next")) {
    /* start scripts for newUI */
  } else {
    /* start scripts for oldUI */
    //createKSButtons(url);
    loadAddKSButtons()
  }
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadAddKSButtons() {
  (async () => {
    // Load module dynamically
    const { createKSButtons } = await import(
      chrome.runtime.getURL("backpack.tf/oldUI/addKSButtons/content.js")
    );

    const url = new URL(location.href);
    createKSButtons(url);
  })();
}
