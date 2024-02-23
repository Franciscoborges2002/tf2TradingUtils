//const backpackUnusualIds = require("../../utils/backpackUnusualsIds.json");

//console.log(backpackUnusualIds)

let buttonsPart = document.getElementsByClassName("justify-content-sm-start")[0];
let nameItemPage = document.getElementsByClassName("card-title")[1];

console.log(nameItemPage.innerHTML);

let nameItem = nameItemPage.innerHTML.replace("Unusual", "").trim();
let nameSplit = nameItem.split(" ");
let indexOfName, effectName;

if(nameItem.includes("Taunt:")){//if it is an taunt
    for(let i = 0; i < nameSplit.length; i++){
        if(nameSplit[i] === "Taunt:"){
            indexOfName = i;
        }
    }

    for(let i = 0; i < indexOfName; i++){//pick the name
        if(i === 0){//pu the name in a string
            effectName = nameSplit[i] + " ";
        }else{
            effectName = effectName + nameSplit[i] + " ";
        }
    }

    console.log(effectName);

}else{//if inst an taunt

}

let btn = document.createElement("input");
btn.type = "button";
btn.value= "asd";
btn.classList.add("btn-primary");
btn.classList.add("btn");
btn.classList.add("rounded-2");

buttonsPart.appendChild(btn);

//buttonsPart.innerHTML = "oioi";