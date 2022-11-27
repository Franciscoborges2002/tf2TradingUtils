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
    let baseURL = 'https://stntrading.eu/item/tf2/'
    let itemNameRemove2Dots = itemName.replace(/:/g, "%3A")
    let itemName2Link = itemNameRemove2Dots.replace(/ /g, "+")


    let url = baseURL + itemName2Link

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