/* ICON:
<a href="https://www.flaticon.com/free-icons/copy" title="copy icons">Copy icons created by apien - Flaticon</a>
*/

var table = document.getElementById('itembanking-list');

var r = 0, c=0, itemName;

var itemsJSON = {};

var items= [];
var prices2Buy = [];
var prices2Sell = [];

while(row=table.rows[r++]){
    var c=0; //start counting columns in row
    var itemName, itemBuyPrice, itemSellPrice;
    while(cell=row.cells[c++]){
        if(r>=2){
            if(c==2){//O nome do item
                let text = cell.innerHTML;
                items.push(cell.innerHTML);
                itemName = cell.innerHTML;
                cell.innerHTML=text + ' <br/> <a href="'  + getLinkBackpack() + '" target="_blank">BP</a> | <a href="' + getLinkSTN(text) +'" target="_blank">STN</a>';
                //cell.innerHTML = `<ins><i><b onclick="copy2Clipboard('${text}')">` + text + "</b></i></ins>";
            }

            if(c==3){
                let text = cell.innerHTML;
                prices2Buy.push(text.trim());
                itemBuyPrice = text.trim();
                
            }

            if(c==4){
                let text = cell.innerHTML;
                itemSellPrice = text.trim()
                prices2Sell.push(text.trim());
            }
        }
    }

    itemsJSON[r] = {
        'itemName': `${itemName}`,
        'buyPrice': `${itemBuyPrice}`,
        'sellPrice': `${itemSellPrice}`
    }
} 

function copy2Clipboard(itemName) {
    navigator.clipboard.writeText(itemName);
}

/* function copy2Clipboard(itemName){
    console.log(itemName);
    //Put in clipboard
    navigator.clipboard.writeText("itemName");
} */

function getLinkSTN(itemName){
    var url = null;//initiate var to return

    let baseURL = 'https://stntrading.eu/item/tf2/';

    //Change put the '
    if(itemName.includes("Vintage Bills Hat")){
        itemName = "Vintage Bill's Hat";
    }

    if(itemName.includes("Bills Hat")){
        itemName = "Bill's Hat";
    }

    if(itemName.includes("Battin a Thousand")){
        itemName = "Taunt: Battin' a Thousand";
    }

    if(itemName.includes("Flippin Awesome")){
        itemName = "Taunt: Flippin' Awesome";
    }

    if(itemName.includes("The Shred Alert")){
        itemName = "The Shred Alert";
    }

    if(itemName.includes("Soldiers Requiem")){
        itemName = "Taunt: Soldier's Requiem";
    }

    if(itemName.includes("Zoomin Broom")){
        itemName = "Taunt: Zoomin' Broom";
    }

    if(itemName.includes("Manns Mint")){
        itemName = "A Mann's Mint";
    }

    if(itemName.includes("Noble Hatters Violet")){
        itemName = "Noble Hatter's Violet";
    }

    if(itemName.includes("Operators Overalls")){
        itemName = "Operator's Overalls";
    }

    if(itemName.includes("The Color of a Gentlemanns Business Pants")){
        itemName = "The Color of a Gentlemann's Business Pants";
    }

    if(itemName.includes("Zepheniahs Greed")){
        itemName = "Zepheniah's Greed";
    }

    if(itemName.includes("Strange Part: Kills While Ubercharged")){
        itemName = "Strange Part: Kills While Übercharged";
    }

    if(itemName.includes("Strange Part: Medics Killed That Have Full")){
        itemName = "Strange Part: Medics Killed That Have Full ÜberCharge";
    }

    if(itemName.includes("Maxs Severed Head")){
        itemName = "Max's Severed Head";
    }

    if(itemName.includes("Towering Pillar Of Summer Shades")){//giving a another space at the end
        itemName = "Towering Pillar Of Summer Shades";
    }

    if(itemName.includes("Mann Co. Directors Cut Reel")){
        itemName = "Mann Co. Director's Cut Reel";
    }

    if(itemName.includes("Smissmas 2015 Festive Gift")){//giving a another space at the end
        itemName = "Smissmas 2015 Festive Gift";
    }

    if(itemName.includes("Gentle Mannes Service Medal")){
        itemName = "Gentle Manne's Service Medal";
    }

    if(itemName.includes("Scotsmanns Stagger")){
        itemName = "Taunt: Scotsmann's Stagger";
    }

    if(itemName.includes("Surgeons Squeezebox")){
        itemName = "Taunt: Surgeon's Squeezebox";
    }

    if(itemName.includes("Trackmans Touchdown")){
        itemName = "Taunt: The Trackman's Touchdown";
    }

    if(itemName.includes("Runners Rhythm")){
        itemName = "Taunt: Runner's Rhythm";
    }

    if(itemName.includes("Genuine Fan OWar")){
        itemName = "Genuine Fan O'War";
    }

    if(itemName.includes("Vintage Fan OWar")){
        itemName = "Vintage Fan O'War";
    }

    if(itemName.includes("Genuine Connivers Kunai")){
        itemName = "Genuine Conniver's Kunai";
    }

    if(itemName.includes("Vintage Connivers Kunai")){
        itemName = "Vintage Conniver's Kunai";
    }

    if(itemName.includes("Vintage Crusaders Crossbow")){
        itemName = "Vintage Crusader's Crossbow";
    }

    if(itemName.includes("Vintage Warriors Spirit")){
        itemName = "Vintage Warrior's Spirit";
    }

    if(itemName.includes("Vintage Fosters Facade")){
        itemName = "Vintage Foster's Facade";
    }

    if(itemName.includes("Fosters Facade")){
        itemName = "Foster's Facade";
    }

    if(itemName.includes("Vintage Stockbrokers Scarf")){
        itemName = "Vintage Stockbroker's Scarf";
    }

    if(itemName.includes("Stockbrokers Scarf")){
        itemName = "Stockbroker's Scarf";
    }

    if(itemName.includes("Vintage Scotsmans Skullcutter")){
        itemName = "Vintage Scotsman's Skullcutter";
    }

    if(itemName.includes("Genuine Quackenbirdt")){
        itemName = "Genuine Quäckenbirdt";
    }

    if(itemName.includes("The Quackenbirdt")){
        itemName = "The Quäckenbirdt";
    }

    if(itemName.includes("Genuine Dashin Hashshashin")){
        itemName = "Genuine Dashin' Hashshashin";
    }

    if(itemName.includes("Horseless Headless Horsemanns Headtaker")){
        itemName = "Unusual Horseless Headless Horsemann's Headtaker";
    }

    if(itemName.includes("Taunt: Pooped Deck")){
        itemName = "Taunt: The Pooped Deck";
    }

    if(itemName.includes("Taunt: Scorchers Solo")){
        itemName = "Taunt: Scorcher's Solo";
    }

    if(itemName.includes("Taunt: Texas Truckin")){
        itemName = "Taunt: Texas Truckin'";
    }

    if(itemName.includes("Taunt: Homerunners Hobby")){
        itemName = "Taunt: The Homerunner's Hobby";
    }

    if(itemName.includes("Taunt: Profane Puppeteer")){
        itemName = "Taunt: The Profane Puppeteer";
    }

    if(itemName.includes("Taunt: Drunken Sailor")){
        itemName = "Taunt: The Drunken Sailor";
    }

    if(itemName.includes("Taunt: Doctors Defibrillators")){
        itemName = "Taunt: Doctor's Defibrillators";
    }

    if(itemName.includes("Taunt: Drunk Manns Cannon")){
        itemName = "Taunt: Drunk Mann's Cannon";
    }

    if(itemName.includes("Taunt: Texas Twirl Em")){
        itemName = "Taunt: Texas Twirl 'Em";
    }

    //Taunt: Texas Twirl Em
    //Remove the uneccessary things of the string
    if(itemName.includes("#")){
        itemName = itemName.substr(0, itemName.indexOf("#") - 1);
    }

    if(itemName.includes("(Secondary)")){
        itemName = itemName.substr(0, itemName.indexOf("(") - 1);
    }

    //%27
    let itemNameReplace2Dots = itemName.replace(/:/g, "%3A");
    let itemName2Link = itemNameReplace2Dots.replace(/ /g, "+");
    itemName2Link = itemName2Link.replace(/'/g, "%27");
    
    if(itemName.includes("Key") || itemName.includes("Squad Surplus Voucher") || itemName.includes("Civilian Grade Stat Clock") || itemName.includes("Festivizer") || itemName.includes("Duck Journal")){
        url = baseURL + "Non-Craftable+" + itemName2Link;
    }else{
        url = baseURL + itemName2Link;
    }

    if(itemName.includes("Collectors")){
        url= "https://stntrading.eu/";
    }

    
    return url;
}

/* function getLinkBackpack(itemName){
    let baseUrl = 'https://backpack.tf/stats/';

    counter++;

    return baseUrl;
} */

function getLinkBackpack(itemName){}

function nameWOSpaces(itemName){
    return itemName.replace(/\s/g, '');
}