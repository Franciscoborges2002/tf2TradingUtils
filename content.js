/* ICON:
<a href="https://www.flaticon.com/free-icons/copy" title="copy icons">Copy icons created by apien - Flaticon</a>
*/

var table = document.getElementById('itembanking-list');

var r = 0, c=0, itemName;

while(row=table.rows[r++]){
    var c=0; //start counting columns in row
    var itemName;
    while(cell=row.cells[c++]){
        if(r>=2){
            if(c==2){//O nome do item
                let text = cell.innerHTML;
                
                //console.log(`<button onclick="${copy2Clipboard(text)}">Copy text</button>`)//"' + copy2Clipboard(text) +'"//${copy2Clipboard(text)}

                console.log(`oi = ${document.getElementById(nameWOSpaces(text))}`);
                    
                cell.innerHTML = `<b id="${nameWOSpaces(text)}">` + text + "</b>" +`<button onclick="navigator.clipboard.writeText()" style="background:#3630a3;color:white;border:0px;"><img src="https://cdn-icons-png.flaticon.com/512/4024/4024457.png" style="width:5%;" /></button>`;
            }
        }
    }
}

function copy2Clipboard(name){
    console.log(name)

    //Put in clipboard
    navigator.clipboard.writeText(name);
    
    //return the name of the function to execute
    return `copy2Clipboard(${name})`;
}

function nameWOSpaces(itemName){
    return itemName.replace(/\s/g, '');
}