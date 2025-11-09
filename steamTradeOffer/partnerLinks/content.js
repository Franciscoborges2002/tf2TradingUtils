// your existing config (unchanged)
const linksInfo = [
  {
    label: "bp.tf",
    href: (id) => `https://backpack.tf/profiles/${id}`,
    classes: ["btn_profile_action", "btn_medium"],
    dropdown_classes: ["popup_menu_item"],
  },
  {
    label: "rep.tf",
    href: (id) => `https://rep.tf/${id}`,
    classes: ["btn_profile_action", "btn_medium"],
    dropdown_classes: ["popup_menu_item"],
  },
  {
    label: "posts.tf",
    href: (id) => `https://posts.tf/users/${id}`,
    classes: ["btn_profile_action", "btn_medium"],
    dropdown_classes: ["popup_menu_item"],
  },
];

// --- new code for the trade page ---

// compute SteamID64 from accountid (data-miniprofile) safely with BigInt
function getTradePartnerSteamID64() {
  const a = document.querySelector(
    ".trade_partner_header .trade_partner_headline a[data-miniprofile]"
  );
  if (!a) return null;

  const accountIdStr = a.getAttribute("data-miniprofile");
  if (!accountIdStr) return null;

  const base = BigInt("76561197960265728");
  const accountId = BigInt(accountIdStr);
  return (base + accountId).toString(); // steamid64 as string
}

function makeLinkEl({ label, href, classes }, steamid64) {
  const link = document.createElement("a");
  link.href = href(steamid64);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  // use your provided classes for styling
  if (classes && classes.length) link.classList.add(...classes);

  const span = document.createElement("span");
  span.textContent = label;
  link.appendChild(span);

  return link;
}

/* 
Function to pass to the script router
*/
export function showPartnerLinks() {
  const traderPartnerHeaderDiv = document.getElementsByClassName(
    "trade_partner_header"
  );
  if (!traderPartnerHeaderDiv) return;
  const steamid64 = getTradePartnerSteamID64();
  if (!steamid64) return;

  const frag = document.createDocumentFragment();
  linksInfo.forEach((info) => {
    frag.appendChild(makeLinkEl(info, steamid64));
    frag.appendChild(document.createTextNode(" "));
  });

  const parent = clearDiv.parentNode;
  if (parent) parent.insertBefore(frag, clearDiv);
}
