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
  if (url.pathname.includes("unusual")) {
    /* start scripts for unusual page */
  }

  if (url.pathname.includes("item") && url.pathname.includes("tf2")) {
    /* start scripts for normal item page */
    loadLink2Backpack();

    loadCopyClipboard();
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

function loadLink2Backpack() {
  (async () => {
    // Load module dynamically
    const { link2Backpack } = await import(
      chrome.runtime.getURL("stntrading.eu/link2Backpack/content.js")
    );

    link2Backpack();
  })();
}
