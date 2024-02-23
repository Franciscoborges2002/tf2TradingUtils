/**
 * Function to cparse the url, remove or add text to an url, the added one will go always after https://backpack.tf/stats/Strange/ and adding an %20 to have an space
 *
 * @parameter url -> get the url to make the changes
 * @parameter operation -> operation to execute 0: remove, 1: add
 * @parameter string -> string to make the operation
 *
 * @return return the new url
 */
function nameURLparser(url, operation, string) {
  let newURL = null;

  //If the string is type of string and length is 0 or null, return null
  if (typeof string === "string" && (string.length === 0 || string === null)) {
    return null;
  }

  //If the operation is netheir 0 nor 1 return null
  if (operation !== 0 || operation !== 1) {
    return null;
  }

  //If the url is type of string and length is 0 or null, return null
  if (typeof url === "string" && (url.length === 0 || url === null)) {
    return null;
  }

  //Swithc case for the cases
  switch (operation) {
    case 0: //If its to remove from the url
      newURL = url.replace(`/${string}/g`, "");
      break;
    case 1: //If its to add to the url
      newURL = url.substring(0, 34);
      newURL = newURL + string + "%20" + url.substring(34);
      break;
    default:
      return newURL;
  }

  return newURL;
}

module.exports = { nameURLparser };
