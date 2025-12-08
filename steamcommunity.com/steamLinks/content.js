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
  {
    label: "steamdb.info",
    href: (id) => `https://steamdb.info/calculator/${id}`,
    classes: ["btn_profile_action", "btn_medium"],
    dropdown_classes: ["popup_menu_item"],
  },
];

export function steamLinks() {
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
    linksInfo.forEach(({ label, href, dropdown_classes }) => {
      const link = document.createElement("a");
      link.href = href(steamid64);
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // good practice
      link.classList.add(...dropdown_classes);

      const span = document.createElement("span");
      span.textContent = label;

      link.appendChild(span);
      locationButtonsDrowdownList.appendChild(link);
    });
  } else {
    //If doenst have the dropdown
    linksInfo.forEach(({ label, href, classes }) => {
      const link = document.createElement("a");
      link.href = href(steamid64);
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // safety for new tabs
      link.classList.add(...classes);

      const span = document.createElement("span");
      span.textContent = label;

      link.appendChild(span);
      locationButtons.appendChild(link);
    });
  }
}