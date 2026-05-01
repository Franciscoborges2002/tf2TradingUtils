/*
 * @TF2TradingUtils
 * filterSpecialListings — backpack.tf (oldUI)
 *
 * Hides sell / buy listings that have spells or strange parts attached.
 * Adds a toggle button near each listings header so the user can reveal them.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/oldUI/filterSpecialListings
 */

/** Returns true when the item element carries any spell or strange-part data */
function isSpecialListing(li) {
  const item = li.querySelector(".item");
  if (!item) return false;

  // Check for any data-spell_* or data-part_name_* attribute
  return [...item.attributes].some(
    ({ name }) => name.startsWith("data-spell_") || name.startsWith("data-part_name_")
  );
}

/** Build and inject a small toggle button before the given <ul> */
function createToggleButton(ul, hidden) {
  const btn = document.createElement("button");

  const refresh = () => {
    btn.textContent = hidden ? "Show special listings ▼" : "Hide special listings ▲";
  };
  refresh();

  // Reuse backpack.tf's own button classes so it fits the page style
  btn.classList.add("btn", "btn-default", "btn-sm");
  btn.style.marginBottom = "8px";

  btn.addEventListener("click", () => {
    hidden = !hidden;
    applyVisibility(ul, hidden);
    refresh();
  });

  ul.insertAdjacentElement("beforebegin", btn);
  return btn;
}

/** Show or hide every special listing inside a <ul> */
function applyVisibility(ul, hidden) {
  ul.querySelectorAll("li.listing").forEach((li) => {
    if (isSpecialListing(li)) {
      li.style.display = hidden ? "none" : "";
    }
  });
}

/**
 * Main export — call once per page load.
 * Works for both the Sell Orders and Buy Orders columns.
 */
export function filterSpecialListings() {
  // backpack.tf renders two .media-list columns (sell + buy)
  const lists = document.querySelectorAll("ul.media-list");

  if (!lists.length) {
    console.warn("[TF2TradingUtils] filterSpecialListings: no listing columns found.");
    return;
  }

  lists.forEach((ul) => {
    const specials = [...ul.querySelectorAll("li.listing")].filter(isSpecialListing);

    // Nothing to do if this column has no special listings
    if (!specials.length) return;

    // Start hidden
    applyVisibility(ul, true);
    createToggleButton(ul, true);

    console.log(
      `[TF2TradingUtils] filterSpecialListings: hid ${specials.length} special listing(s) in`,
      ul.closest(".col-md-6") ? "a column" : "the page"
    );
  });
}