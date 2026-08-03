/**
 * @TF2TradingUtils - acceptTradeOffers
 * On the trade offers inbox (steamcommunity.com/profiles/<id>/tradeoffers/
 * or /id/<vanity>/tradeoffers/), adds an "Accept Offer" action next to
 * each incoming offer's "Respond to Offer | Decline Trade" links, so
 * you don't have to open the full trade offer page just to accept.
 *
 * Only added when there isn't already a native "Accept"-labeled action
 * in that offer's footer, and only for offers that actually show both
 * "Respond to Offer" and "Decline Trade" (i.e. incoming offers waiting
 * on us — outgoing offers show different actions and can't be accepted
 * by us anyway).
 *
 * Accepts by POSTing directly to the same endpoint Steam's own trade
 * offer page uses (steamcommunity.com/tradeoffer/<id>/accept) — no
 * confirmation step here, same as the backpack.tf one-click offers;
 * Steam's own mobile/email confirmation still gates the trade actually
 * completing.
 *
 * NOTE: assumes offers are all present on page load (no pagination/
 * infinite-scroll handling) — matches the rest of this listing page's
 * classic (non-SPA) structure, but flag it if that turns out wrong.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/acceptTradeOffers
 */

const BTN_CLASS = "tf2utils-accept-btn";

function getSessionId() {
  const match = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getPartnerSteamId64(tradeEl) {
  const el = tradeEl.querySelector(".tradeoffer_partner [data-miniprofile]");
  const accountId = el?.getAttribute("data-miniprofile");
  if (!accountId) return null;

  const base = BigInt("76561197960265728");
  return (base + BigInt(accountId)).toString();
}

async function acceptOffer(tradeofferid, partner, btn) {
  const sessionid = getSessionId();
  if (!sessionid) {
    window.alert("[TF2TradingUtils] Accept Offer: could not read session id — try reloading the page.");
    return;
  }

  btn.textContent = "Accepting…";

  // Steam's accept endpoint 403s unless the request's Referer is this
  // exact trade offer's own page — a forbidden header we can't set
  // directly from fetch/XHR. The background worker rewrites it for us
  // via a short-lived declarativeNetRequest rule scoped to this one
  // accept URL.
  const setup = await chrome.runtime.sendMessage({ type: "SET_ACCEPT_REFERER", tradeofferid });
  if (!setup?.ok) {
    window.alert("[TF2TradingUtils] Accept Offer: could not prepare request (" + (setup?.error ?? "unknown error") + ").");
    btn.textContent = "Accept Offer";
    return;
  }

  const body = new FormData();
  body.append("sessionid", sessionid);
  body.append("serverid", "1");
  body.append("tradeofferid", tradeofferid);
  body.append("partner", partner);
  body.append("captcha", "");

  try {
    const res = await fetch(`https://steamcommunity.com/tradeoffer/${tradeofferid}/accept`, {
      method: "POST",
      body,
    });
    const data = await res.json();

    if (data.strError) {
      window.alert("[TF2TradingUtils] Accept Offer failed: " + data.strError);
      btn.textContent = "Accept Offer";
      return;
    }

    btn.textContent = (data.needs_mobile_confirmation || data.needs_email_confirmation)
      ? "Confirm on mobile"
      : "Accepted";
  } catch (err) {
    window.alert("[TF2TradingUtils] Accept Offer failed: " + err);
    btn.textContent = "Accept Offer";
  } finally {
    chrome.runtime.sendMessage({ type: "CLEAR_ACCEPT_REFERER" });
  }
}

/** Add an "Accept Offer" action to a single .tradeoffer entry, if eligible. */
function addAcceptButton(tradeEl) {
  const actions = tradeEl.querySelector(".tradeoffer_footer_actions");
  if (!actions) return false;
  if (actions.querySelector(`.${BTN_CLASS}`)) return false; // already added

  const links = [...actions.querySelectorAll("a")];

  // Already has a native "Accept" action — nothing to do.
  if (links.some((a) => /accept/i.test(a.textContent))) return false;

  const respondLink = links.find((a) => /ShowTradeOffer\(\s*'(\d+)'/.test(a.getAttribute("href") || ""));
  const declineLink = links.find((a) => /DeclineTradeOffer\(\s*'(\d+)'/.test(a.getAttribute("href") || ""));
  // Only offers waiting on our response show both of these — outgoing
  // offers we sent have different actions and can't be accepted by us.
  if (!respondLink || !declineLink) return false;

  const tradeofferid = respondLink.getAttribute("href").match(/ShowTradeOffer\(\s*'(\d+)'/)?.[1];
  if (!tradeofferid) return false;

  const partner = getPartnerSteamId64(tradeEl);
  if (!partner) return false;

  const btn = document.createElement("a");
  btn.href = "#";
  btn.className = `whiteLink ${BTN_CLASS}`;
  btn.textContent = "Accept Offer";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    acceptOffer(tradeofferid, partner, btn);
  });

  const sep = document.createTextNode(" | ");
  actions.insertBefore(sep, respondLink);
  actions.insertBefore(btn, sep);

  return true;
}

/** Main export — call once per page load. */
export function addAcceptTradeOffers() {
  const offers = document.querySelectorAll(".tradeoffer");
  if (!offers.length) return;

  let added = 0;
  offers.forEach((tradeEl) => {
    if (addAcceptButton(tradeEl)) added++;
  });

  console.log(`[TF2TradingUtils] acceptTradeOffers: added ${added} button(s)`);
}
