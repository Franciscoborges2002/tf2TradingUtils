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
                
                //console.log(`<button onclick="${copy2Clipboard(text)}">Copy text</button>`)
                    
                cell.innerHTML = text + '<button onclick="' + copy2Clipboard() +'" style="background:#3630a3;color:white;border:0px;"><img src="https://cdn-icons-png.flaticon.com/512/4024/4024457.png" style="width:10%;"></button>';
            }
        }
    }
}

function copy2Clipboard(){
    //Pick the name of the item


    //Put the text to the clipboard
    //navigator.clipboard.writeText(text);º

    console.log("")
    
    //return the name of the function to execute
    return "copy2Clipboard()";
}