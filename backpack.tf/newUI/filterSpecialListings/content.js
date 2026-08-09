/*
 * @TF2TradingUtils
 * filterSpecialListings — backpack.tf newUI (next.backpack.tf)
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/backpack.tf/newUI/filterSpecialListings
 */

// A killstreak weapon's sheen/killstreaker render in .item__icons as an
// SVG classed "attribute__<name>" (confirmed: a Specialized Killstreak
// C.A.P.P.E.R's only icon there is `<svg class="... attribute__deadly-
// daffodil">` for its Deadly Daffodil sheen — no src/alt/title at all,
// just that class). Unlike spells/strange parts (many different possible
// attachments), sheens and killstreakers are a small, fixed, well-known
// set of names in TF2 regardless of which weapon they're on, so those
// specific classes can be matched precisely and excluded — a killstreak
// item isn't a "special" listing the way a spell/strange-part one is,
// and searching by killstreak tier was hiding every single result
// because every one of them carries a sheen (Specialized+) and/or
// killstreaker (Professional) icon.
const KILLSTREAK_ATTRIBUTE_CLASSES = new Set([
  // Generic fallback classes — confirmed on a Professional Killstreak
  // C.A.P.P.E.R whose only icon was `<img src=".../ksProfessional.png"
  // class="item__icons__icon attribute__killstreaker">`: the specific
  // killstreaker particle apparently isn't always recognized, in which
  // case it renders under this generic class (with the tier badge image)
  // instead of a specific one. "attribute__sheen" isn't confirmed the
  // same way yet, but included defensively in case the site falls back
  // the same way for an unrecognized sheen.
  "attribute__killstreaker",
  "attribute__sheen",
  // Sheens
  "attribute__team-shine",
  "attribute__deadly-daffodil",
  "attribute__manndarin",
  "attribute__mean-green",
  "attribute__agonizing-emerald",
  "attribute__villainous-violet",
  "attribute__hot-rod",
  // Killstreakers
  "attribute__fire-horns",
  "attribute__cerebral-discharge",
  "attribute__tornado",
  "attribute__flames",
  "attribute__singularity",
  "attribute__incinerator",
  "attribute__hypno-beam",
]);

function isKillstreakIcon(el) {
  return [...el.classList].some((c) => KILLSTREAK_ATTRIBUTE_CLASSES.has(c));
}

function isSpecialListing(listingEl) {
  const iconsDiv = listingEl.querySelector(".item__icons");
  if (!iconsDiv) return false;
  const icons = [...iconsDiv.querySelectorAll("svg, img")];
  return icons.some((icon) => !isKillstreakIcon(icon));
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