import { loadIconSvg } from "../../utils/icons.js";

/**
 * Adds a small copy icon right after the item's <h1> title (instead of
 * a separate "Copy to Clipboard" button down with the other links) —
 * clicking it copies the cleaned item name to the clipboard.
 */
export async function copyNameClipboard() {
  // Anchored to the same container itemLinks/content.js uses (not just
  // "the page's first <h1>") — the page renders a second, hidden
  // mobile-layout copy of this same card (Bootstrap's "d-none d-sm-block"
  // implies a "d-block d-sm-none" twin elsewhere), each with its own
  // <h1>. Picking the wrong one puts the icon somewhere invisible.
  // For a mistyped/unknown item, stntrading.eu renders a ".error-box"
  // page instead, with no <h1> at all — nothing useful to copy there.
  if (document.querySelector(".error-box")) return;

  const cardBody = document.getElementsByClassName("card-body")[1];
  const title = cardBody?.querySelector("h1");
  if (!title) return;

  injectStyles();

  const [copySvg, checkSvg] = await Promise.all([loadIconSvg("copy"), loadIconSvg("check")]);

  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "tf2utils-copy-icon";
  icon.title = "Copy item name";
  icon.setAttribute("aria-label", "Copy item name");
  icon.innerHTML = copySvg;

  // Capture the clean name up front — the h1's own text, before the
  // icon is anywhere near it.
  const itemName = removeNonImportantWords(title.textContent || "");

  icon.addEventListener("click", () => {
    navigator.clipboard.writeText(itemName);
    flashCopied(icon, copySvg, checkSvg);
  });

  // The icon must never become a child of the <h1> — itemLinks/content.js
  // reads document.querySelector("h1").innerHTML to get the item name,
  // and an icon nested inside it would corrupt that string (this broke
  // itemLinks entirely). Instead, wrap the <h1> and the icon together in
  // a flex row, leaving the <h1> itself untouched.
  const wrapper = document.createElement("div");
  wrapper.className = "tf2utils-copy-wrapper";
  title.insertAdjacentElement("beforebegin", wrapper);
  wrapper.appendChild(title);
  wrapper.appendChild(icon);
}

function flashCopied(icon, copySvg, checkSvg) {
  icon.innerHTML = checkSvg;
  icon.classList.add("tf2utils-copy-icon--done");
  setTimeout(() => {
    icon.innerHTML = copySvg;
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
