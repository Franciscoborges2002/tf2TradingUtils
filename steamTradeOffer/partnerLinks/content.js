/* 
Possible websites to link to the trade partner
*/
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

/* 
Get the SteamID64 from accountid
*/
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

/* 
Function to create theh button swith links to refirect to the websites
*/
function makeButtonLinkEl({ label, href, classes }, steamid64) {
  //create button and link
  const button = document.createElement("button");
  const link = document.createElement("a");
  //classes to button
  button.classList.add("btn_grey_black");
  button.classList.add("btn_medium");
  //configure link
  link.href = href(steamid64);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.classList.add(...classes);

  //create the text
  const span = document.createElement("span");
  span.textContent = label;
  //append text and button
  link.appendChild(span);
  button.appendChild(link)

  return button;
}

/* 
Function to pass to the script router
*/
export function showPartnerLinks() {
  const traderPartnerHeaderDiv = document.querySelector('.trade_partner_header')
  if (!traderPartnerHeaderDiv) return;
  //get steamid64
  const steamid64 = getTradePartnerSteamID64();
  if (!steamid64) return;

  //create the div to append the buttons
  const div = document.createElement("div");
  div.classList.add("trade_partner_info_block") //add class
  const title = document.createElement("h3")
  title.textContent = "Partner Links"
  div.appendChild(title)
  //add the buttons
  linksInfo.forEach((info) => {
    div.appendChild(makeButtonLinkEl(info, steamid64));
  });

  //append the buttons to the page
  if (parent) traderPartnerHeaderDiv.insertBefore(div, parent.lastElementChild);
  return;
}
