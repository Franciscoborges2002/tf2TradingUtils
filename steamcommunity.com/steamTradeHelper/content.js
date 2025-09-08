const getLocationToAppend = document.getElementById("inventory_displaycontrols");//To get the place where im going to append the stuff

/**
 * Scan the partner's TF2 inventory currently loaded in the DOM and show metal counts.
 * Counts: Scrap Metal, Reclaimed Metal, Refined Metal.
 * Also shows "refined equivalent" (9 scrap = 1 ref, 3 scrap = 1 rec).
 */
function getPure(){

}

/**
 * Function that starts all script
 */
function putInformation(){    
    //get other acc steam id 64
    const othersLinkProfile = document.getElementsByClassName("offerheader")[1].childNodes[3].childNodes[1].childNodes[0].href;//to get the offerhead of the person im going to send the offer
    const othersSteamId = othersLinkProfile.substring(36);
    console.log("olaaa "+ othersLinkProfile + " a " +othersSteamId)
        
    //get own acc steam id 64
}

putInformation();