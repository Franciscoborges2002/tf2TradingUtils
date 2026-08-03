/**
 * @TF2TradingUtils - background
 * MV3 service worker.
 *
 * Only job right now: work around steamcommunity.com's
 * /tradeoffer/<id>/accept endpoint returning 403 unless the request's
 * Referer is that exact trade offer's own page. Content scripts can
 * never set Referer directly — it's a forbidden header on fetch/XHR —
 * so this registers a short-lived declarativeNetRequest session rule
 * that rewrites it for one specific accept request, removed right
 * after by the content script that used it.
 *
 * See steamcommunity.com/acceptTradeOffers/content.js.
 */

const ACCEPT_REFERER_RULE_ID = 1;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SET_ACCEPT_REFERER" && msg.tradeofferid) {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ACCEPT_REFERER_RULE_ID],
      addRules: [{
        id: ACCEPT_REFERER_RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "Referer", operation: "set", value: `https://steamcommunity.com/tradeoffer/${msg.tradeofferid}/` },
          ],
        },
        condition: {
          urlFilter: `https://steamcommunity.com/tradeoffer/${msg.tradeofferid}/accept`,
          resourceTypes: ["xmlhttprequest"],
        },
      }],
    })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }

  if (msg?.type === "CLEAR_ACCEPT_REFERER") {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ACCEPT_REFERER_RULE_ID],
    })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
