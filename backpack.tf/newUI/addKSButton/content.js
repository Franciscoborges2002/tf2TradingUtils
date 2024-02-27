/**
 * Array object to contain the stuff of the buttons
 */
let buttons = [
  { text: "Normal Gun", urlCompletitionClassifieds: "&killstreak_tier=0", urlCompletitionStats: "" },
  { text: "Normal Killstreak", urlCompletitionClassifieds: "&killstreak_tier=1", urlCompletitionStats: "Killstreak%20" },
  { text: "Specialized Killstreak", urlCompletitionClassifieds: "&killstreak_tier=2", urlCompletitionStats: "Specialized%20Killstreak%20" },
  { text: "Professional Killstreak", urlCompletitionClassifieds: "&killstreak_tier=3", urlCompletitionStats: "Professional%20Killstreak%20" },
];

/**
 * Function to create 4 buttons to show the KS on a gun in a backpack.tf website
 *
 * @parameter url -> get the url of the current tab
 */
function createButtons(url) {
  let placeAddButtons = document.getElementsByClassName("stats-header")[0];

  let divButtons = document.createElement("div"); // Create the button element for normal gun

  divButtons.class = "stats-header-ks";
  //divButtons.class = "pb-2";
  divButtons.style.paddingBottom = "16px"; //Add pading bottom to the div

  let buttonNormalGun = document.createElement("button"); // Create the button element for normal gun
  let buttonNormalKS = document.createElement("button"); // Create the button element for the normal Killstreak
  let buttonSpecializedKS = document.createElement("button"); // Create the button element for specialized Killstreak
  let buttonProKS = document.createElement("button"); // Create the button element for professional Killstreak

  let linkNormalGun = document.createElement("a"); // Create the link element for normal gun
  let linkNormalKS = document.createElement("a"); // Create the link element for the normal Killstreak
  let linkSpecializedKS = document.createElement("a"); // Create the link element for specialized Killstreak
  let linkProKS = document.createElement("a"); // Create the link element for professional Killstreak

  linkNormalGun.href = buttons[0]

  //Adding names to the buttons
  buttonNormalGun.textContent = buttons[0].text;
  buttonNormalKS.textContent = buttons[1].text;
  buttonSpecializedKS.textContent = buttons[2].text;
  buttonProKS.textContent = buttons[3].text;

  /* divButtons.appendChild(buttonNormalGun);
  divButtons.appendChild(buttonNormalKS);
  divButtons.appendChild(buttonSpecializedKS);
  divButtons.appendChild(buttonProKS); */

  placeAddButtons.appendChild(divButtons);

  //If the page is in the classifieds
  if (url.includes("classifieds")) {
  } else {
    //If the page is in the stats
    //let a = nameURLparser(url, 1, );
    
  }
}

// Calling the function
createButtons(window.location.toString());
