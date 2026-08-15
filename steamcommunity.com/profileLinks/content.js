import { SITE_BRAND_COLORS } from "../../utils/constants/colors.js";

// ─────────────────────────────────────────────────────────────
// Shared across both profileLinks() (this user's own profile header)
// and tradeOfferProfileLinks() (the trade partner's quick-links row) —
// bp.tf/rep.tf/posts.tf/liquid.tf appear in both, just with different
// DOM/styling wrappers per context. Each site's own accent color (used
// by both contexts too — see ACCENT_CLASS below) comes from the same
// SITE_BRAND_COLORS palette other injected UI in this extension uses.
// ─────────────────────────────────────────────────────────────
const EXTERNAL_PROFILE_LINKS = {
  bpTf:     { label: "bp.tf", href: (id) => `https://backpack.tf/profiles/${id}`, color: SITE_BRAND_COLORS.backpackTf },
  repTf:    { label: "rep.tf", href: (id) => `https://rep.tf/${id}`, color: SITE_BRAND_COLORS.repTf },
  postsTf:  { label: "posts.tf", href: (id) => `https://posts.tf/users/${id}`, color: SITE_BRAND_COLORS.postsTf },
  liquidTf: { label: "liquid.tf", href: (id) => `https://liquid.tf/store/${id}`, color: SITE_BRAND_COLORS.liquidTf },
};

const STYLES_ID = "tf2utils-profilelinks-styles";
// Class added alongside each button's own site-native classes, purely
// to carry the colored left-border accent via --tf2utils-accent.
const ACCENT_CLASS = "tf2utils-accent-link";

function injectStyles() {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .${ACCENT_CLASS} {
      border-left: 3px solid var(--tf2utils-accent, #999);
    }

    .tf2utils-profilelinks-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 6px 0;
    }
    .tf2utils-profilelinks-btn {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      line-height: 1.4;
      color: #fff;
      background: rgba(255,255,255,0.06);
      border-top: 1px solid rgba(255,255,255,0.1);
      border-right: 1px solid rgba(255,255,255,0.1);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      border-radius: 3px;
      text-decoration: none;
      transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    }
    .tf2utils-profilelinks-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.2);
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
    }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
// profileLinks — buttons on a user's own profile page
// (/profiles/<id>, /id/<vanity>): bp.tf, rep.tf, posts.tf,
// steamdb.info, liquid.tf.
// ─────────────────────────────────────────────────────────────
const linksInfo = [
  { ...EXTERNAL_PROFILE_LINKS.bpTf, classes: ["btn_profile_action", "btn_medium"], dropdown_classes: ["popup_menu_item"] },
  { ...EXTERNAL_PROFILE_LINKS.repTf, classes: ["btn_profile_action", "btn_medium"], dropdown_classes: ["popup_menu_item"] },
  { ...EXTERNAL_PROFILE_LINKS.postsTf, classes: ["btn_profile_action", "btn_medium"], dropdown_classes: ["popup_menu_item"] },
  {
    label: "steamdb.info",
    href: (id) => `https://steamdb.info/calculator/${id}`,
    color: SITE_BRAND_COLORS.steamdb,
    classes: ["btn_profile_action", "btn_medium"],
    dropdown_classes: ["popup_menu_item"],
  },
  { ...EXTERNAL_PROFILE_LINKS.liquidTf, classes: ["btn_profile_action", "btn_medium"], dropdown_classes: ["popup_menu_item"] },
];

export function profileLinks() {
  let url = window.location.toString(); // Get the url of the page

  if (
    url.includes("friends") ||
    url.includes("tradeoffers") ||
    url.includes("tradehistory") ||
    url.includes("games") ||
    url.includes("groups") ||
    url.includes("badges") ||
    url.includes("inventory") ||
    url.includes("screenshots") ||
    url.includes("images") ||
    url.includes("videos") ||
    url.includes("myworkshopfiles") || // for workshop items, merchandasing, collections and guides
    url.includes("home") || //Community part
    url.includes("edit") //Edit part of the profile
  ) {
    return; //Dont execute the rest of the script
  }

  injectStyles();

  let locationButtons = document.getElementsByClassName(
    "profile_header_actions"
  )[0]; //To use on own profile
  let locationButtonsDrowdown = document.getElementById(
    "profile_action_dropdown"
  ); //To check if its profile of other person
  let locationButtonsDrowdownList =
    document.getElementsByClassName("shadow_content")[0]; //To put on dropdown list

  //Get the steamid64
  let allText = document.getElementsByClassName(
    "responsive_page_template_content"
  )[0].innerHTML; //Get the text in the page
  let steamid64 = allText.substring(
    allText.search("steamid") + 10,
    allText.search("personaname") - 3
  ); //substring from all the text gotten from the allText var

  //Verify if has the drowpdown menu nt he profile header actions
  if (locationButtonsDrowdown !== null) {
    linksInfo.forEach(({ label, href, color, dropdown_classes }) => {
      const link = document.createElement("a");
      link.href = href(steamid64);
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // good practice
      link.classList.add(...dropdown_classes, ACCENT_CLASS);
      link.style.setProperty("--tf2utils-accent", color);

      const span = document.createElement("span");
      span.textContent = label;

      link.appendChild(span);
      locationButtonsDrowdownList.appendChild(link);
    });
  } else {
    //If doenst have the dropdown
    linksInfo.forEach(({ label, href, color, classes }) => {
      const link = document.createElement("a");
      link.href = href(steamid64);
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // safety for new tabs
      link.classList.add(...classes, ACCENT_CLASS);
      link.style.setProperty("--tf2utils-accent", color);

      const span = document.createElement("span");
      span.textContent = label;

      link.appendChild(span);
      locationButtons.appendChild(link);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// tradeOfferProfileLinks — quick-link buttons (Steam profile, Rep.TF,
// bp.tf, posts.tf, liquid.tf store) for the trade PARTNER on each
// entry of the trade offers inbox (/profiles/<id>/tradeoffers/), sent
// offers (/profiles/<id>/tradeoffers/sent/) and trade history
// (/profiles/<id>/tradehistory/) pages. History uses a different row
// shape (.tradehistoryrow, not .tradeoffer — same distinction
// tradeOfferCurrency's own processTradeoffer/processHistoryRow split
// handles), but is simpler here: the "You traded with <a
// data-miniprofile>" description names the partner directly, no
// primary/secondary side-guessing needed.
//
// The partner's steamid64 for a .tradeoffer entry is derived from the
// avatar links' own `data-miniprofile` attribute (Steam's accountid —
// the lower 32 bits of steamid64) rather than the avatar's href, which
// is sometimes a vanity URL (https://steamcommunity.com/id/<vanity>),
// unusable to build the other sites' URLs directly. steamid64 =
// accountid + 76561197960265728 (Steam's own standard offset) —
// confirmed against a real .tradeoffer, where this matched the id
// embedded in that entry's "Report this trade" link
// (onclick="ReportTradeScam('<steamid64>', ...)") exactly.
//
// That report link was the original extraction source, but it turned
// out to only exist on RECEIVED offers — a SENT offer has no "report"
// action at all, so that approach silently failed there. Both
// `.tradeoffer_items primary`/`secondary` avatars carry
// `data-miniprofile` on every entry regardless of direction, so this
// reads both, converts each to steamid64, and picks whichever one
// *isn't* your own id (read from the page's own URL,
// `/profiles/<your-id>/tradeoffers...`) — primary is the partner on a
// received offer, secondary on a sent one, so this doesn't assume
// either side's role.
// ─────────────────────────────────────────────────────────────

const TRADE_PROCESSED_ATTR = "data-tf2utils-profilelinks";

const TRADE_LINKS = [
  { label: "Steam", href: (id) => `https://steamcommunity.com/profiles/${id}`, color: SITE_BRAND_COLORS.steam },
  EXTERNAL_PROFILE_LINKS.repTf,
  EXTERNAL_PROFILE_LINKS.bpTf,
  EXTERNAL_PROFILE_LINKS.postsTf,
  EXTERNAL_PROFILE_LINKS.liquidTf,
];

function buildTradeLinksRow(steamid64) {
  const row = document.createElement("div");
  row.className = "tf2utils-profilelinks-row";

  for (const { label, href, color } of TRADE_LINKS) {
    const a = document.createElement("a");
    a.href = href(steamid64);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    a.className = `tf2utils-profilelinks-btn ${ACCENT_CLASS}`;
    a.style.setProperty("--tf2utils-accent", color);
    row.appendChild(a);
  }

  return row;
}

// Steam's own accountid -> steamid64 offset — see comment block above.
const STEAMID64_BASE = 76561197960265728n;

function steamId64FromAccountId(accountId) {
  try {
    return (STEAMID64_BASE + BigInt(accountId)).toString();
  } catch {
    return null;
  }
}

// Your own steamid64 — every .tradeoffer entry on this page has you on
// one side, and this page is always at /profiles/<your-id>/tradeoffers...
function getMySteamId64() {
  const match = window.location.pathname.match(/^\/profiles\/(\d+)/);
  return match ? match[1] : null;
}

// .tradeoffer (inbox/sent) — see comment block above for why this
// reads both avatars' data-miniprofile instead of a single fixed side.
function partnerIdFromTradeoffer(tradeEl, myId) {
  const avatars = tradeEl.querySelectorAll(
    ":scope > .tradeoffer_items_ctn > .tradeoffer_items > .tradeoffer_items_avatar_ctn > .tradeoffer_avatar[data-miniprofile]"
  );

  for (const avatar of avatars) {
    const id64 = steamId64FromAccountId(avatar.getAttribute("data-miniprofile"));
    if (id64 && id64 !== myId) return id64;
  }
  return null;
}

/** Processes one .tradeoffer — inserts the button row after the currency-total box (tradeOfferCurrency), or the header if that's not there. */
function processTradeoffer(tradeEl, myId) {
  if (tradeEl.hasAttribute(TRADE_PROCESSED_ATTR)) return;

  const steamid64 = partnerIdFromTradeoffer(tradeEl, myId);
  if (!steamid64) return;
  tradeEl.setAttribute(TRADE_PROCESSED_ATTR, "1");

  const header = tradeEl.querySelector(":scope > .tradeoffer_header");
  if (!header) return;

  const anchor = tradeEl.querySelector(":scope > .tf2utils-currency-total") || header;
  anchor.insertAdjacentElement("afterend", buildTradeLinksRow(steamid64));
}

// .tradehistoryrow — the partner is named directly in the "You traded
// with X" description, so no primary/secondary side-guessing needed.
function partnerIdFromHistoryRow(rowEl) {
  const link = rowEl.querySelector(".tradehistory_event_description a[data-miniprofile]");
  return link ? steamId64FromAccountId(link.getAttribute("data-miniprofile")) : null;
}

/** Processes one .tradehistoryrow — inserts the button row after the currency-total box (tradeOfferCurrency), or the description if that's not there. */
function processHistoryRow(rowEl) {
  if (rowEl.hasAttribute(TRADE_PROCESSED_ATTR)) return;

  const steamid64 = partnerIdFromHistoryRow(rowEl);
  if (!steamid64) return;
  rowEl.setAttribute(TRADE_PROCESSED_ATTR, "1");

  const description = rowEl.querySelector(":scope > .tradehistory_content > .tradehistory_event_description");
  if (!description) return;

  const anchor = rowEl.querySelector(":scope > .tradehistory_content > .tf2utils-currency-total") || description;
  anchor.insertAdjacentElement("afterend", buildTradeLinksRow(steamid64));
}

function scanTradeOfferProfileLinks() {
  const trades = document.querySelectorAll(".tradeoffer");
  const historyRows = document.querySelectorAll(".tradehistoryrow");
  if (!trades.length && !historyRows.length) return;

  injectStyles();

  if (trades.length) {
    const myId = getMySteamId64();
    if (myId) trades.forEach((tradeEl) => processTradeoffer(tradeEl, myId));
  }

  historyRows.forEach(processHistoryRow);
}

/**
 * Main export — call once per page load, then keep watching: both
 * tradeOfferCurrency's currency-total box (the insertion anchor) and
 * Steam's own trade entries can render after this script's initial run.
 */
export function tradeOfferProfileLinks() {
  scanTradeOfferProfileLinks();

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scanTradeOfferProfileLinks, 200);
  }).observe(document.body, { childList: true, subtree: true });
}
