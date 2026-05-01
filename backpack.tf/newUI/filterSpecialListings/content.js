/*
 * @TF2TradingUtils
 * filterSpecialListings — backpack.tf newUI (next.backpack.tf)
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/filterSpecialListings
 */

function isSpecialListing(listingEl) {
  const iconsDiv = listingEl.querySelector(".item__icons");
  if (!iconsDiv) return false;
  return iconsDiv.querySelector("svg, img") !== null;
}

function injectStyles() {
  if (document.getElementById("tf2utils-newui-filter-styles")) return;
  const s = document.createElement("style");
  s.id = "tf2utils-newui-filter-styles";
  s.textContent = `
    .tf2utils-hidden { display: none !important; }
    .tf2utils-filter-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 6px 0 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.07);
      color: #d0d0d0;
      white-space: nowrap;
    }
    .tf2utils-filter-btn:hover { background: rgba(255,255,255,0.13); }
  `;
  document.head.appendChild(s);
}

const colState = new WeakMap();

function applyVisibility(column, hidden) {
  column.querySelectorAll(".listing").forEach((el) => {
    if (isSpecialListing(el)) {
      el.classList.toggle("tf2utils-hidden", hidden);
    }
  });
}

function processColumn(column) {
  const allListings = [...column.querySelectorAll(".listing")];
  if (!allListings.length) return;

  const specials = allListings.filter(isSpecialListing);
  if (!specials.length) return;

  let state = colState.get(column);

  if (!state) {
    let hidden = true;

    const btn = document.createElement("button");
    btn.className = "tf2utils-filter-btn";

    const refresh = () => {
      btn.textContent = hidden
        ? `Show special listings ▼ (${specials.length})`
        : `Hide special listings ▲`;
    };
    refresh();

    btn.addEventListener("click", () => {
      hidden = !hidden;
      state.hidden = hidden;
      applyVisibility(column, hidden);
      refresh();
    });

    const header = column.querySelector(".classifieds__column__header");
    if (header) header.insertAdjacentElement("afterend", btn);
    else column.prepend(btn);

    state = { hidden, btn };
    colState.set(column, state);
  }

  applyVisibility(column, state.hidden);
}

function scan() {
  document.querySelectorAll(".classifieds__column").forEach(processColumn);
}

export function filterSpecialListingsNewUI() {
  injectStyles();

  scan();
  setTimeout(scan, 600);
  setTimeout(scan, 1500);
  setTimeout(scan, 3000);

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 350);
  }).observe(document.body, { childList: true, subtree: true });
}