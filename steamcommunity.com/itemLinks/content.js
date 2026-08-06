// itemLinks.js
import { COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { steamMarketUrl, backpackStatsUrl, stnTradingUrl } from "../../utils/itemLinks.js";

function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  const h0 = c0?.querySelector("h1");
  if (h0) return { container: c0, title: h0 };

  const h1 = c1?.querySelector("h1");
  if (h1) return { container: c1, title: h1 };

  return null;
}

export function showItemLinks() {
  const picked = pickContainer();
  if (!picked) return false;

  const { container, title } = picked;
  const itemName = title.textContent.trim();
  if (!itemName) return false;

  // remove old injected links if item changed
  const prev = container.dataset.injectedFor || "";
  if (prev !== itemName) {
    container.querySelectorAll(".custom-market-links").forEach((n) => n.remove());
  }

  // Prevent duplicate for the same item — but the item info panel is
  // rendered by Steam's own framework and re-renders its content at
  // least once (e.g. once price data streams in), wiping out anything
  // we injected while leaving the container node (and its dataset)
  // intact. So don't just trust the marker — confirm the links are
  // actually still there before skipping.
  if (container.dataset.injectedFor === itemName && container.querySelector(".custom-market-links")) {
    return true;
  }

  // Quality is hardcoded to "Unique" for now — the item info panel
  // doesn't expose the item's actual quality anywhere we've found yet.
  const marketUrl = steamMarketUrl(itemName);
  const backpackUrl = backpackStatsUrl({ name: itemName, quality: "Unique", craftable: true });
  const stnUrl = stnTradingUrl({ name: itemName, craftable: true });

  const links = document.createElement("div");
  links.className = "custom-market-links";
  links.style.marginTop = "8px";
  links.style.display = "flex";
  links.style.gap = "8px";

  const btnStyle =
    "display:inline-flex;align-items:center;justify-content:center;" +
    "padding:6px 12px;border-radius:6px;text-decoration:none;" +
    `background:${COLOR_PANEL_BG};color:#ffffff;font-weight:600;font-size:12px;` +
    "border:1px solid rgba(255,255,255,0.15);transition:0.15s ease;";

  links.innerHTML = `
    <a class="custom-link-btn" href="${marketUrl}" target="_blank" rel="noreferrer" style="${btnStyle}">
      Market
    </a>
    <a class="custom-link-btn" href="${backpackUrl}" target="_blank" rel="noreferrer" style="${btnStyle}">
      backpack.tf
    </a>
    <a class="custom-link-btn" href="${stnUrl}" target="_blank" rel="noreferrer" style="${btnStyle}">
      stntrading.eu
    </a>
  `;

  // subtle hover effect
  links.querySelectorAll(".custom-link-btn").forEach((a) => {
    a.addEventListener("mouseenter", () => {
      a.style.filter = "brightness(1.15)";
    });
    a.addEventListener("mouseleave", () => {
      a.style.filter = "none";
    });
  });

  title.insertAdjacentElement("afterend", links);
  container.dataset.injectedFor = itemName;

  return true;
}