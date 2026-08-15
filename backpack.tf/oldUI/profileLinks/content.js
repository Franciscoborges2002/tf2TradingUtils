/*
@TF2TradingUtils
Description:
Adds a liquid.tf store button next to the existing posts.tf/Rep.TF/
Forums buttons on a user's classic backpack.tf profile page —
/profiles/<id>, /u/<vanity> and /friends/<id> all render the same
".profile .information .buttons" block, confirmed identical markup on
all three.

The steamid64 isn't pulled from the URL itself, since /u/<vanity> pages
don't carry the numeric id there — instead it's read straight out of
one of the buttons already in that block (posts.tf's and Rep.TF's own
hrefs both end in the plain numeric steamid64), which all three page
variants already resolve correctly for us.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/oldUI/profileLinks
*/

const STEAMID64_RE = /\d{17}/;
const BUTTON_CLASS = "tf2utils-liquidtf-btn";

export function addProfileLinks() {
  const buttons = document.querySelector(".profile .information .buttons");
  if (!buttons) return;
  if (buttons.querySelector(`.${BUTTON_CLASS}`)) return; // already added

  const steamid64 = findSteamId64(buttons);
  if (!steamid64) return;

  const link = document.createElement("a");
  link.className = `btn btn-primary btn-xs ${BUTTON_CLASS}`;
  link.href = `https://liquid.tf/store/${steamid64}`;
  link.target = "_blank";

  const icon = document.createElement("i");
  icon.className = "fa fa-shopping-cart";
  link.appendChild(icon);
  link.appendChild(document.createTextNode(" liquid.tf"));

  buttons.appendChild(link);
}

// Reads the steamid64 out of whichever existing button's href already
// has it — same value regardless of which one, so the first match wins.
function findSteamId64(buttons) {
  for (const a of buttons.querySelectorAll("a[href]")) {
    const match = a.href.match(STEAMID64_RE);
    if (match) return match[0];
  }
  return null;
}
