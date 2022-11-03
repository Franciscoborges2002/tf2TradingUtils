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
                cell.innerHTML = `<ins><i><b onclick="copy2Clipboard('${text}')">` + text + "</b></i></ins>";
            }
        }
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

function nameWOSpaces(itemName){
    return itemName.replace(/\s/g, '');
}