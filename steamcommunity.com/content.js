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
async function scriptRouter() {
  //Get the location of the website
  let url = new URL(window.location.href);

  if(url.pathname.includes("inventory")){
    loadItemLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "itemLinks",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/itemLinks",
    ]);

    loadInventoryCurrencyCounter();
    EXT_SCRIPT_INFO.scripts.push([
      "inventoryCurrencyCounter",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/inventoryCurrencyCounter",
    ]);

    loadItemDescriptionToggle();
    EXT_SCRIPT_INFO.scripts.push([
      "itemDescriptionToggle",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/itemDescriptionToggle",
    ]);
  }

  if(url.pathname.includes("profile") || url.pathname.includes("id")){
  bots = await loadBotDb();
  console.log(bots);
  /* If there is the next in hostname, redirect to newUI scripts */
  loadSteamLinks();
    EXT_SCRIPT_INFO.scripts.push([
      "loadSteamLinks",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/steamLinks",
    ]);
    loadBotRep(bots);
    EXT_SCRIPT_INFO.scripts.push([
      "botRep",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/botRep",
    ]);
  }

  if (url.pathname.includes("tradeoffers")) {
    loadAcceptTradeOffers();
    EXT_SCRIPT_INFO.scripts.push([
      "acceptTradeOffers",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/acceptTradeOffers",
    ]);
  }

  if (url.pathname.includes("tradeoffers") || url.pathname.includes("tradehistory")) {
    loadGroupTradeItems();
    EXT_SCRIPT_INFO.scripts.push([
      "groupTradeItems",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/groupTradeItems",
    ]);
  }

  if (url.pathname.includes("tradeoffers") || url.pathname.includes("tradehistory")) {
    loadTradeOfferCurrency();
    EXT_SCRIPT_INFO.scripts.push([
      "tradeOfferCurrency",
      "https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/tradeOfferCurrency",
    ]);
  }
}

//Start the script
scriptRouter();

/* 
Utility funtions to load scripts
*/
function loadSteamLinks() {
  (async () => {
    // Load module dynamically
    const { steamLinks } = await import(
      chrome.runtime.getURL("steamcommunity.com/steamLinks/content.js")
    );

    steamLinks();
  })();
}

function loadBotRep(bots) {
  (async () => {
    // Load module dynamically
    const { showBotRepProfile } = await import(
      chrome.runtime.getURL("steamcommunity.com/botRep/content.js")
    );

    showBotRepProfile(bots);
  })();
}

function loadAcceptTradeOffers() {
  (async () => {
    const { addAcceptTradeOffers } = await import(
      chrome.runtime.getURL("steamcommunity.com/acceptTradeOffers/content.js")
    );
    addAcceptTradeOffers();
  })();
}

function loadGroupTradeItems() {
  (async () => {
    const { groupTradeItems } = await import(
      chrome.runtime.getURL("steamcommunity.com/groupTradeItems/content.js")
    );
    groupTradeItems();
  })();
}

function loadTradeOfferCurrency() {
  (async () => {
    const { addTradeCurrencyTotals } = await import(
      chrome.runtime.getURL("steamcommunity.com/tradeOfferCurrency/content.js")
    );
    addTradeCurrencyTotals();
  })();
}

function loadInventoryCurrencyCounter() {
  (async () => {
    const { showInventoryCurrencyCounter } = await import(
      chrome.runtime.getURL("steamcommunity.com/inventoryCurrencyCounter/content.js")
    );
    showInventoryCurrencyCounter();
  })();
}

function loadItemLinks() {
  (async () => {
    // Load module dynamically
    const { showItemLinks } = await import(
      chrome.runtime.getURL("steamcommunity.com/itemLinks/content.js")
    );

    runWithRetries(showItemLinks);

    const target = document.querySelector("#iteminfo0") ||
                   document.querySelector("#iteminfo1") ||
                   document.body;

    new MutationObserver(() => showItemLinks())
      .observe(target, { childList: true, subtree: true });
  })();
}

function loadItemDescriptionToggle() {
  (async () => {
    const { addItemDescriptionToggle } = await import(
      chrome.runtime.getURL("steamcommunity.com/itemDescriptionToggle/content.js")
    );

    runWithRetries(addItemDescriptionToggle);

    const target = document.querySelector("#iteminfo0") ||
                   document.querySelector("#iteminfo1") ||
                   document.body;

    new MutationObserver(() => addItemDescriptionToggle())
      .observe(target, { childList: true, subtree: true });
  })();
}

/**
 * Runs `fn` immediately, then again on a short interval for a bounded
 * window. The very first item Steam shows on inventory page load can
 * finish rendering into #iteminfo0/#iteminfo1 (and, for TF2-gated
 * scripts, the TF2 grid container getting its own final id) slightly
 * after this router's dynamic import resolves — a MutationObserver set
 * up right after that render already happened never fires for it,
 * since nothing changes there again until the user clicks a different
 * item, so relying on the observer alone silently misses the first
 * item specifically. Safe to call repeatedly: every function passed
 * here already guards its own "already processed" state internally.
 */
function runWithRetries(fn, { retries = 10, intervalMs = 300 } = {}) {
  fn();
  let attempt = 0;
  const timer = setInterval(() => {
    attempt++;
    fn();
    if (attempt >= retries) clearInterval(timer);
  }, intervalMs);
}

// Small helper so it works in Chrome + Firefox
const api = typeof browser !== "undefined" ? browser : chrome;

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
