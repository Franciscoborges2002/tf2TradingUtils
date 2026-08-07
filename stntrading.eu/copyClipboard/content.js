/**
 * Adds a small copy icon right after the item's <h3> title (instead of
 * a separate "Copy to Clipboard" button down with the other links) —
 * clicking it copies the cleaned item name to the clipboard.
 */
export function copyNameClipboard() {
  // Anchored to the same container itemLinks/content.js uses (not just
  // "the page's first <h3>") — the page renders a second, hidden
  // mobile-layout copy of this same card (Bootstrap's "d-none d-sm-block"
  // implies a "d-block d-sm-none" twin elsewhere), each with its own
  // <h3>. Picking the wrong one puts the icon somewhere invisible.
  const cardBody = document.getElementsByClassName("card-body")[1];
  const title = cardBody?.querySelector("h3");
  if (!title) return;

  injectStyles();

  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "tf2utils-copy-icon";
  icon.title = "Copy item name";
  icon.setAttribute("aria-label", "Copy item name");
  icon.innerHTML = COPY_SVG;

  // Capture the clean name up front — the h3's own text, before the
  // icon is anywhere near it.
  const itemName = removeNonImportantWords(title.textContent || "");

  icon.addEventListener("click", () => {
    navigator.clipboard.writeText(itemName);
    flashCopied(icon);
  });

  // The icon must never become a child of the <h3> — itemLinks/content.js
  // reads the card's <h3>.innerHTML to get the item name, and an icon
  // nested inside it would corrupt that string (this broke itemLinks
  // entirely). Instead, wrap the <h3> and the icon together in a flex
  // row, leaving the <h3> itself untouched.
  const wrapper = document.createElement("div");
  wrapper.className = "tf2utils-copy-wrapper";
  title.insertAdjacentElement("beforebegin", wrapper);
  wrapper.appendChild(title);
  wrapper.appendChild(icon);
}

const COPY_SVG = `
  <svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="7" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>
    <path d="M4.5 13.5H3.5A1.5 1.5 0 0 1 2 12V3.5A1.5 1.5 0 0 1 3.5 2H12a1.5 1.5 0 0 1 1.5 1.5v1" fill="none" stroke="currentColor" stroke-width="1.6"></path>
  </svg>
`;

const CHECK_SVG = `
  <svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10.5l4.5 4.5L17 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;

function flashCopied(icon) {
  icon.innerHTML = CHECK_SVG;
  icon.classList.add("tf2utils-copy-icon--done");
  setTimeout(() => {
    icon.innerHTML = COPY_SVG;
    icon.classList.remove("tf2utils-copy-icon--done");
  }, 1200);
}

function injectStyles() {
  const STYLES_ID = "tf2utils-copy-icon-styles";
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    .tf2utils-copy-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tf2utils-copy-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      opacity: 0.55;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .tf2utils-copy-icon:hover {
      opacity: 0.9;
    }
    .tf2utils-copy-icon--done {
      color: #2e8b40;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Removes unimportant words like "The" and "Non-Craftable" so the name
 * copies cleanly across sites/platforms.
 *
 * @param itemName - item name to apply the filter to
 * @returns the item name without the unimportant words
 */
function removeNonImportantWords(itemName) {
  if (itemName.startsWith("The")) {
    itemName = itemName.replace(/The /g, "");
  }

  if (itemName.startsWith("Non-Craftable")) {
    itemName = itemName.replace(/Non-Craftable /g, "");
  }

  return itemName;
}
