/* 
@TF2TradingUtils
Description:
Enhances the Scrap.tf itembanking list table (#itembanking-list) by appending
quick links for each item to external trading sites.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/scrap.tf/scrapItemsTableLinks
*/
import { backpackStatsUrl, stnTradingUrl, merchantTfUrl, gladiatorTfUrl, CRATE_NUMBER_RE } from "../../utils/itemLinks.js";

var table = document.getElementById("itembanking-list"); //Get the table in the website

/**
 * Main Function to put the links
 */
export function scrapItemsTableLinks() {
  var iterateRow = 0, // Iterated row
    column= 0,// Iterated Column
    itemName,//To have the item name
    row,
    cell;

    /* Block if the page is the buy page and not the ite m page */
    if(!table){
      return
    }


  // Iterate for all rows of the table
  while ((row = table.rows[iterateRow++])) {
    //Iterate for all the cells
    while ((cell = row.cells[column++])) {
      if (iterateRow >= 2) {
        if (column == 2) {
          //Item name
          itemName = cell.innerHTML; // to get the item name
          cell.innerHTML =
            itemName +
            ' <br/> <a href="' +
            getLinkBackpack(itemName) + //Call the function to get the link of bp.tf
            '" target="_blank">BP</a> | <a href="' +
            getLinkSTN(itemName) + //get the link of stntrading.eu
            '" target="_blank">STN</a> | <a href="' +
            getLinkMerchant(itemName) + //get the link of merchant.tf
            '" target="_blank">Merchant</a> | <a href="' +
            getLinkGladiator(itemName) + //get the link of gladiator.tf
            '" target="_blank">Gladiator</a>';
        }
      }
    }
    column = 0;
  }
}

/**
 * Function to generate the links to stntrading.eu
 */
function getLinkSTN(itemName) {
  var url = null; //initiate var to return

  //Change put the '
  if (itemName.includes("Vintage Bills Hat")) {
    itemName = "Vintage Bill's Hat";
  }

  if (itemName.includes("Bills Hat")) {
    itemName = "Bill's Hat";
  }

  if (itemName.includes("Battin a Thousand")) {
    itemName = "Taunt: Battin' a Thousand";
  }

  if (itemName.includes("Flippin Awesome")) {
    itemName = "Taunt: Flippin' Awesome";
  }

  if (itemName.includes("The Shred Alert")) {
    itemName = "The Shred Alert";
  }

  if (itemName.includes("Soldiers Requiem")) {
    itemName = "Taunt: Soldier's Requiem";
  }

  if (itemName.includes("Zoomin Broom")) {
    itemName = "Taunt: Zoomin' Broom";
  }

  if (itemName.includes("Manns Mint")) {
    itemName = "A Mann's Mint";
  }

  if (itemName.includes("Noble Hatters Violet")) {
    itemName = "Noble Hatter's Violet";
  }

  if (itemName.includes("Operators Overalls")) {
    itemName = "Operator's Overalls";
  }

  if (itemName.includes("The Color of a Gentlemanns Business Pants")) {
    itemName = "The Color of a Gentlemann's Business Pants";
  }

  if (itemName.includes("Zepheniahs Greed")) {
    itemName = "Zepheniah's Greed";
  }

  if (itemName.includes("Strange Part: Kills While Ubercharged")) {
    itemName = "Strange Part: Kills While Übercharged";
  }

  if (itemName.includes("Strange Part: Medics Killed That Have Full")) {
    itemName = "Strange Part: Medics Killed That Have Full ÜberCharge";
  }

  if (itemName.includes("Maxs Severed Head")) {
    itemName = "Max's Severed Head";
  }

  if (itemName.includes("Towering Pillar Of Summer Shades")) {
    //giving a another space at the end
    itemName = "Towering Pillar Of Summer Shades";
  }

  if (itemName.includes("Mann Co. Directors Cut Reel")) {
    itemName = "Mann Co. Director's Cut Reel";
  }

  if (itemName.includes("Smissmas 2015 Festive Gift")) {
    //giving a another space at the end
    itemName = "Smissmas 2015 Festive Gift";
  }

  if (itemName.includes("Gentle Mannes Service Medal")) {
    itemName = "Gentle Manne's Service Medal";
  }

  if (itemName.includes("Scotsmanns Stagger")) {
    itemName = "Taunt: Scotsmann's Stagger";
  }

  if (itemName.includes("Surgeons Squeezebox")) {
    itemName = "Taunt: Surgeon's Squeezebox";
  }

  if (itemName.includes("Trackmans Touchdown")) {
    itemName = "Taunt: The Trackman's Touchdown";
  }

  if (itemName.includes("Runners Rhythm")) {
    itemName = "Taunt: Runner's Rhythm";
  }

  if (itemName.includes("Genuine Fan OWar")) {
    itemName = "Genuine Fan O'War";
  }

  if (itemName.includes("Vintage Fan OWar")) {
    itemName = "Vintage Fan O'War";
  }

  if (itemName.includes("Genuine Connivers Kunai")) {
    itemName = "Genuine Conniver's Kunai";
  }

  if (itemName.includes("Vintage Connivers Kunai")) {
    itemName = "Vintage Conniver's Kunai";
  }

  if (itemName.includes("Vintage Crusaders Crossbow")) {
    itemName = "Vintage Crusader's Crossbow";
  }

  if (itemName.includes("Vintage Warriors Spirit")) {
    itemName = "Vintage Warrior's Spirit";
  }

  if (itemName.includes("Vintage Fosters Facade")) {
    itemName = "Vintage Foster's Facade";
  }

  if (itemName.includes("Fosters Facade")) {
    itemName = "Foster's Facade";
  }

  if (itemName.includes("Vintage Stockbrokers Scarf")) {
    itemName = "Vintage Stockbroker's Scarf";
  }

  if (itemName.includes("Stockbrokers Scarf")) {
    itemName = "Stockbroker's Scarf";
  }

  if (itemName.includes("Vintage Scotsmans Skullcutter")) {
    itemName = "Vintage Scotsman's Skullcutter";
  }

  if (itemName.includes("Genuine Quackenbirdt")) {
    itemName = "Genuine Quäckenbirdt";
  }

  if (itemName.includes("The Quackenbirdt")) {
    itemName = "The Quäckenbirdt";
  }

  if (itemName.includes("Genuine Dashin Hashshashin")) {
    itemName = "Genuine Dashin' Hashshashin";
  }

  if (itemName.includes("Horseless Headless Horsemanns Headtaker")) {
    itemName = "Unusual Horseless Headless Horsemann's Headtaker";
  }

  if (itemName.includes("Taunt: Pooped Deck")) {
    itemName = "Taunt: The Pooped Deck";
  }

  if (itemName.includes("Taunt: Scorchers Solo")) {
    itemName = "Taunt: Scorcher's Solo";
  }

  if (itemName.includes("Taunt: Texas Truckin")) {
    itemName = "Taunt: Texas Truckin'";
  }

  if (itemName.includes("Taunt: Homerunners Hobby")) {
    itemName = "Taunt: The Homerunner's Hobby";
  }

  if (itemName.includes("Taunt: Profane Puppeteer")) {
    itemName = "Taunt: The Profane Puppeteer";
  }

  if (itemName.includes("Taunt: Drunken Sailor")) {
    itemName = "Taunt: The Drunken Sailor";
  }

  if (itemName.includes("Taunt: Doctors Defibrillators")) {
    itemName = "Taunt: Doctor's Defibrillators";
  }

  if (itemName.includes("Taunt: Drunk Manns Cannon")) {
    itemName = "Taunt: Drunk Mann's Cannon";
  }

  if (itemName.includes("Taunt: Texas Twirl Em")) {
    itemName = "Taunt: Texas Twirl 'Em";
  }

  //Taunt: Texas Twirl Em
  //Remove the uneccessary things of the string
  if (itemName.includes("#")) {
    itemName = itemName.substr(0, itemName.indexOf("#") - 1);
  }

  if (itemName.includes("(Secondary)")) {
    itemName = itemName.substr(0, itemName.indexOf("(") - 1);
  }

  const isNonCraftable =
    itemName.includes("Key") ||
    itemName.includes("Squad Surplus Voucher") ||
    itemName.includes("Civilian Grade Stat Clock") ||
    itemName.includes("Festivizer") ||
    itemName.includes("Duck Journal");

  url = stnTradingUrl({ name: itemName, craftable: !isNonCraftable });

  if (itemName.includes("Collectors")) {
    //stntrading doesnt have collectors items
    url = "https://stntrading.eu/";
  }

  return url;
}

/**
 * Function to generate the links to backpack.tf
 */
function getLinkBackpack(itemName) {
  let quality = "Unique";

  //if the name includes vintage
  if (itemName.includes("Vintage")) {
    quality = "Vintage";
    itemName = itemName.replace("Vintage ", "");
  } else if (itemName.includes("Genuine")) {
    quality = "Genuine";
    itemName = itemName.replace("Genuine ", "");
  } else if (itemName.includes("Strange")) {
    quality = "Strange";
    itemName = itemName.replace("Strange ", "");
  } else if (itemName.includes("Collectors")) {
    quality = "Collector's";
    itemName = itemName.replace("Collectors ", "");
  }

  // Taunts keep their "Taunt: " prefix as part of the name; everything
  // else has a leading "The " (if any) dropped, matching backpack.tf's
  // own URL convention.
  const isTaunt = itemName.includes("Taunt:");
  const name = isTaunt ? itemName : itemName.replace("The ", "");

  return backpackStatsUrl({ name, quality, craftable: true });
}

/**
 * Function to generate the links to merchant.tf. merchant.tf's
 * "/trade/<slug>" is just a search-bar prefill (see merchantTfUrl()'s
 * own doc), so this doesn't need the name-typo fixups getLinkSTN()
 * needs for an exact page match — a close-enough query still surfaces
 * the right item in the search results.
 */
function getLinkMerchant(itemName) {
  const crateMatch = itemName.match(CRATE_NUMBER_RE);
  let name = crateMatch ? itemName.slice(0, crateMatch.index) : itemName;

  const craftable = !name.includes("Non-Craftable");
  if (!craftable) name = name.replace("Non-Craftable ", "");

  let quality;
  if (name.includes("Vintage")) {
    quality = "Vintage";
    name = name.replace("Vintage ", "");
  } else if (name.includes("Genuine")) {
    quality = "Genuine";
    name = name.replace("Genuine ", "");
  } else if (name.includes("Strange")) {
    quality = "Strange";
    name = name.replace("Strange ", "");
  } else if (name.includes("Collectors")) {
    quality = "Collector's";
    name = name.replace("Collectors ", "");
  }

  return merchantTfUrl({ name, quality, craftable, crateNumber: crateMatch ? crateMatch[1] : undefined });
}

/**
 * Function to generate the links to gladiator.tf. Same parsing
 * getLinkMerchant() does — gladiatorTfUrl() takes the same
 * name/quality/craftable/crateNumber shape merchantTfUrl() does.
 */
function getLinkGladiator(itemName) {
  const crateMatch = itemName.match(CRATE_NUMBER_RE);
  let name = crateMatch ? itemName.slice(0, crateMatch.index) : itemName;

  const craftable = !name.includes("Non-Craftable");
  if (!craftable) name = name.replace("Non-Craftable ", "");

  let quality;
  if (name.includes("Vintage")) {
    quality = "Vintage";
    name = name.replace("Vintage ", "");
  } else if (name.includes("Genuine")) {
    quality = "Genuine";
    name = name.replace("Genuine ", "");
  } else if (name.includes("Strange")) {
    quality = "Strange";
    name = name.replace("Strange ", "");
  } else if (name.includes("Collectors")) {
    quality = "Collector's";
    name = name.replace("Collectors ", "");
  }

  return gladiatorTfUrl({ name, quality, craftable, crateNumber: crateMatch ? crateMatch[1] : undefined });
}
