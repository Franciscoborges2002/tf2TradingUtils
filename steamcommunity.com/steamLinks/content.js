function showUsefullLinks() {
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
    url.includes("images")||
    url.includes("videos")||
    url.includes("myworkshopfiles")||// for workshop items, merchandasing, collections and guides
    url.includes("home")||//Community part
    url.includes("edit")//Edit part of the profile
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
    let linkBp = document.createElement("a"); // Create the link element for the backpack.tf
    let linkSpanBp = document.createElement("span"); // Create the span element for the backpack.tf
    let linkRep = document.createElement("a"); // Create the link element for the rep.tf
    let linkSpanRep = document.createElement("span"); // Create the span element for the rep.tf

    linkBp.classList.add("popup_menu_item"); //Add the class of the menu item
    linkRep.classList.add("popup_menu_item"); //Add the class of the menu item

    //get the steam id 64 of the user

    //Add all the stuff for the new item in the drop down menu
    linkBp.href = "https://backpack.tf/profiles/" + steamid64; //Add the link
    linkBp.target = "_blank"; //To open in a new page
    linkSpanBp.textContent = "  Backpack.tf"; //Add the text in the span
    linkBp.appendChild(linkSpanBp); //Add the span to the

    //Add all the stuff for the new item in the drop down menu
    linkRep.href = "https://rep.tf/" + steamid64; //Add the link
    linkRep.target = "_blank"; //To open in a new page
    linkSpanRep.textContent = "Rep.tf"; //Add the text in the span
    linkRep.appendChild(linkSpanRep); //Add the span to the

    locationButtonsDrowdownList.appendChild(linkBp); //Add the backpack.tf link to the drop down list
    locationButtonsDrowdownList.appendChild(linkRep); //Add the backpack.tf link to the drop down list
  } else {
    //If doenst have the dropdown
    let linkBp = document.createElement("a"); // Create the link element for the backpack.tf
    let textBp = document.createElement("span"); // Create the text for backpack.tf
    let linkRep = document.createElement("a"); // Create the link element for the rep.tf
    let textRep = document.createElement("span"); // Create the text for rep.tf

    linkBp.classList.add("btn_profile_action"); //Add the class
    linkBp.classList.add("btn_medium"); //Add the class
    linkRep.classList.add("btn_profile_action"); //Add the class
    linkRep.classList.add("btn_medium"); //Add the class

    linkBp.href = "https://backpack.tf/profiles/" + steamid64; //Add the link
    linkBp.target = "_blank"; //To open in a new page
    textBp.textContent = "bp.tf";
    linkBp.appendChild(textBp);

    linkRep.href = "https://rep.tf/" + steamid64; //Add the link
    linkRep.target = "_blank"; //To open in a new page
    textRep.textContent = "rep.tf";
    linkRep.appendChild(textRep);

    locationButtons.appendChild(linkBp);
    locationButtons.appendChild(linkRep);
  }
}

showUsefullLinks();
