/*
@TF2TradingUtils
Description:
Adds external profile links (Rep.TF, posts.tf, backpack.tf Forums,
Steam Community, liquid.tf) to a user's next.backpack.tf profile page.
Two insertion points:

- /profiles/<id> and /profiles/<id>/compare: the profile banner's left
  column — the one holding the username link, join date and (when
  logged in, viewing someone else's profile) a "Send Trade Offer"
  button, each its own row. A new row is added the same way ("Send
  Trade Offer" is wrapped in its own `<div class="mt-2">`), anchored off
  the username link (`/profiles/<id>/user`, always present) rather than
  the trade-offer button (only shows up when logged in and viewing
  someone else). All five links go in this one new row — none of them
  (not just liquid.tf) are static page content here; the site's own
  Rep.TF/posts.tf/Forums/Steam Community buttons only exist as the
  contents of a hover/focus-triggered username tooltip
  (`trigger="mouseenter focus"` in its markup), so they never render on
  page load, only after hovering — confirmed by fetching the real
  on-load markup, which has no trace of them. Their label text/href
  shape/`content` tooltip text is copied from that real (if
  hover-only) markup, just re-hosted in an always-visible row instead.
- /profiles/<id>/user: the "Steam Account Information" card's header
  actions slot, which is empty by default — liquid.tf only, per the
  original ask for that specific spot. There's more than one card on
  that page, so the right one is found by its header title text, not
  just ".card__header" alone. No confirmed example of what a button in
  that slot normally looks like.

Neither insertion point is found via the `data-v-xxxxxxxx` Vue
scoped-style attributes visible throughout the markup — those hashes
change between deploys and aren't something to build a selector on.

steamid64 is read directly from the URL path (/profiles/<id>/...) —
unlike classic backpack.tf's /u/<vanity> route, next.backpack.tf always
uses the numeric id there, confirmed against all three page variants.

next.backpack.tf is a Vue/Nuxt SPA, so content renders asynchronously
and route changes between the three page variants don't reload the
page — same re-scan pattern (delayed retries + debounced
MutationObserver) as oneClickOffer/filterSpecialListings (newUI). Either
container can also persist across a client-side navigation to a
*different* user's profile without being torn down, so this always
refreshes every link's href on an existing row/button rather than only
adding them once and leaving them there.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/profileLinks
*/

const BANNER_ROW_CLASS    = "tf2utils-profilelinks-banner-row";
const HEADER_BUTTON_CLASS = "tf2utils-liquidtf-header-btn";

// label used both as the button text and (slugified) as its dedup class.
const PROFILE_LINKS = [
  {
    label: "Rep.TF",
    href: (id) => `https://rep.tf/${id}`,
    content: "Open this user's profile on Rep.TF, a community ban aggregator.",
  },
  {
    label: "posts.tf",
    href: (id) => `https://posts.tf/users/${id}`,
    content: "Open this user's profile on posts.tf.",
  },
  {
    label: "backpack.tf Forums",
    href: (id) => `https://forums.backpack.tf/steam.php?steamid=${id}`,
    content: "Open this user's profile on the backpack.tf Forums.",
  },
  {
    label: "Steam Community",
    href: (id) => `https://steamcommunity.com/profiles/${id}`,
    content: "Open this user's profile on Steam Community.",
  },
  {
    label: "liquid.tf",
    href: (id) => `https://liquid.tf/store/${id}`,
    content: "Open this user's profile on liquid.tf.",
  },
];

function getSteamId64() {
  const match = window.location.pathname.match(/^\/profiles\/(\d+)/);
  return match ? match[1] : null;
}

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function makeLink(label, href, content, className) {
  const link = document.createElement("a");
  link.target = "_blank";
  link.className = `btn btn-sm btn-outline-brand ${className}`;
  link.setAttribute("content", content);
  link.textContent = label;
  link.href = href;
  return link;
}

// Banner's left column — username link, join date, "Send Trade Offer"
// each their own row; adds a matching new `<div class="mt-2">` row
// holding all five profile links.
function addBannerLinks(steamid64) {
  const usernameLink = Array.from(document.querySelectorAll('a[href$="/user"]'))
    .find((a) => /^\/profiles\/\d+\/user$/.test(a.getAttribute("href") || ""));
  const column = usernameLink?.closest(".flex-column");
  if (!column) return;

  let row = column.querySelector(`.${BANNER_ROW_CLASS}`);
  if (!row) {
    row = document.createElement("div");
    row.className = `mt-2 d-flex flex-wrap gap-1 ${BANNER_ROW_CLASS}`;
    column.appendChild(row);
  }

  for (const { label, href, content } of PROFILE_LINKS) {
    const className = `tf2utils-profilelink-${slug(label)}`;
    let link = row.querySelector(`.${className}`);
    if (!link) {
      link = makeLink(label, href(steamid64), content, className);
      row.appendChild(link);
    } else {
      link.href = href(steamid64);
    }
  }
}

// "Steam Account Information" card's header actions slot (/user page only).
function addHeaderButton(steamid64) {
  const header = Array.from(document.querySelectorAll(".card__header")).find((h) =>
    h.querySelector(".card__header__title")?.textContent.trim().startsWith("Steam Account Information")
  );
  const actions = header?.querySelector(".card__header__actions");
  if (!actions) return;

  const entry = PROFILE_LINKS.find((l) => l.label === "liquid.tf");
  let link = actions.querySelector(`.${HEADER_BUTTON_CLASS}`);
  if (!link) {
    link = makeLink(entry.label, entry.href(steamid64), entry.content, HEADER_BUTTON_CLASS);
    actions.appendChild(link);
  } else {
    link.href = entry.href(steamid64);
  }
}

function scan() {
  const steamid64 = getSteamId64();
  if (!steamid64) return;

  addBannerLinks(steamid64);
  if (window.location.pathname.endsWith("/user")) {
    addHeaderButton(steamid64);
  }
}

/**
 * Main export — call once per page load. See file header for the SPA
 * re-scan reasoning.
 */
export function addProfileLinksNewUI() {
  scan();
  setTimeout(scan, 600);
  setTimeout(scan, 1500);
  setTimeout(scan, 3000);

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 350);
  }).observe(document.body, { childList: true, subtree: true });
}
