/* 
@TF2TradingUtils
Description:
Utility module that generates Backpack.tf Stats, Classifieds, and Wiki links 
based on hovered item attributes. Supports:
- Quality detection (Unique, Vintage, Strange)
- Killstreak prefixes (KS / S. KS / P. KS)
- Craftability detection
- Australium identification
- Strange Part safety (does not strip "Strange Part:" names)
This script is injected via the extension router and powers the dynamic tooltip links.

Link:
https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/scrap.tf/scrapHoverItemLinks
*/

import { COLOR_PANEL_BG } from "../../utils/constants/colors.js";
import { steamMarketUrl, backpackStatsUrl, mannCoStoreUrl, marketplaceTfUrl, wikiUrl } from "../../utils/itemLinks.js";

export function ItemLinks() {
  // store pending hover info
  let pendingItemEl = null;

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    #tf2utils-mini-modal{
      position:fixed;
      left:12px;
      bottom:12px;
      z-index:2147483647;
      padding:10px 12px;
      border-radius:10px;
      background: ${COLOR_PANEL_BG};
      color:#fff;
      border:1px solid #2a2a2a;
      box-shadow:0 8px 20px rgba(0,0,0,.35);
      font:12px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial;
      max-width:260px;
      display:block;
    }
    #tf2utils-mini-modal .tf2utils-mini-modal-name{ font-weight:700; margin-bottom:8px; }
    #tf2utils-mini-modal .tf2utils-mini-modal-btns{ display:flex; gap:8px; flex-wrap:wrap; padding: 4px; }
    #tf2utils-mini-modal .btn{
      border:1px solid #2e2e2e;
      background: #352f2cff;
      color:#eaeaea;
      padding:5px 8px;
      border-radius:6px;
      text-decoration:none;
      font-size:12px;
    }
    #tf2utils-mini-modal .btn:hover{ background: ${COLOR_PANEL_BG}; }
  `;
  document.head.appendChild(style);

  // Create the persistent modal
  const modal = document.createElement("div");
  modal.id = "tf2utils-mini-modal";
  modal.innerHTML = `
    <div class="tf2utils-mini-modal-name">Middle-click or Ctrl+click an item…</div>
    <div class="tf2utils-mini-modal-btns"></div>
  `;
  document.documentElement.appendChild(modal);

  function updateModal(name, itemEl) {
    const className = modal.querySelector(".tf2utils-mini-modal-name");
    const classBtns = modal.querySelector(".tf2utils-mini-modal-btns");

    // Killstreak tier and Festivized don't always show up as literal
    // text in the tooltip name (same issue as Genuine quality) — add
    // them if missing. Steam's own order is Festivized, then Killstreak
    // tier, then the item name.
    const { prefix: ksPrefix } = getKillstreakInfo(itemEl);
    let displayName = name;
    if (ksPrefix && !displayName.includes(ksPrefix.trim())) displayName = ksPrefix + displayName;
    if (isFestivized() && !displayName.includes("Festivized")) displayName = "Festivized " + displayName;
    className.textContent = displayName;
    classBtns.innerHTML = "";

    makeLinks(name, itemEl)
      .then((links) => {
        links.forEach(({ label, href }) => {
          const btn = document.createElement("a");
          btn.className = "btn";
          btn.textContent = label;
          btn.href = href;
          btn.target = "_blank";
          classBtns.appendChild(btn);
        });
      })
      .catch((err) => console.warn("[TF2Utils] Failed to build item links:", err));
  }

  // Watch for hover tooltip becoming visible
  const hoverEl = document.querySelector(".hover-over");
  if (!hoverEl) {
    console.warn("[TF2Utils] Scrap.tf hover-over not found.");
    return;
  }

  /* Get the item information */
  document.addEventListener("mouseover", (e) => {
    const item = e.target.closest(".item.hoverable");
    if (!item) return;
    pendingItemEl = item;
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".item.hoverable")) pendingItemEl = null;
  });

  // Updates the modal when the user clicks with the mouse wheel on the item when hovering
  document.addEventListener(
    "mousedown",
    (e) => {
      //Verify if there is any pending item to be displayed
      if (!pendingItemEl) return;

      //Check eaither if is pressing the mouse wheel or the control
      //CtrlKey: Windows/linux, metaKey: Mac
      const isActivate =
        e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      //Verify if one of the 2 options were pressed in order to update the modal
      if (!isActivate) return;

      const hoverEl = document.querySelector(".hover-over");
      if (!hoverEl) return;

      // tooltip must be visible (Scrap uses display:none)
      if (hoverEl.style.display === "none") return;

      const titleSpan = hoverEl.querySelector(".hover-over-title span");
      const titleDiv = hoverEl.querySelector(".hover-over-title");
      const contentDiv = hoverEl.querySelector(".hover-over-content");

      const name = (
        titleSpan?.textContent ||
        titleDiv?.textContent ||
        ""
      ).trim();
      const contentHtml = contentDiv?.innerHTML || "";

      if (!name) return;

      // If you want quality class directly from tooltip:
      const qualityClass = titleSpan
        ? [...titleSpan.classList].find((c) => c.startsWith("quality"))
        : null;
      console.log({ name, qualityClass, contentHtml, pendingItemEl });

      // update modal
      updateModal(name, pendingItemEl);

      // prevent auto-scroll(mouse wheel)  or redirection to new page(ctrl)
      e.preventDefault();
    },
    true
  );

  console.log("[TF2Utils] Hover capture + wheel-click to update active.");
}

/* 
Function to create the links to be displayed
@args:
  - name: Name of the item
  - itemEl: HTML item element (get more information about the item, ks, paint, unu effect)
*/
async function makeLinks(name, itemEl) {
  // --- QUALITY DETECTION ---
  // Default: Unique
  let qualityName = "Unique";
  let unusualEffectName = null;

  if (itemEl.classList.contains("quality0")) {
    qualityName = "Normal";
  }
  if (itemEl.classList.contains("quality1")) {
    qualityName = "Genuine";
  }
  if (itemEl.classList.contains("quality3")) {
    qualityName = "Vintage";
  }
  if (itemEl.classList.contains("quality5")) {
    qualityName = "Unusual";
    unusualEffectName = getUnusualEffectName(itemEl);
  }
  if (itemEl.classList.contains("quality6")) {
    qualityName = "Unique";
  }
  if (itemEl.classList.contains("quality0")) {
    qualityName = "Self Made";
  }
  if (itemEl.classList.contains("quality11")) {
    qualityName = "Strange";
  }
  if (itemEl.classList.contains("quality14")) {
    qualityName = "Haunted";
  }
  if (itemEl.classList.contains("quality14")) {
    qualityName = "Collector's";
  }

  // --- KILLSTREAK DETECTION ---
  const { prefix: ksPrefix, tier: ksTier } = getKillstreakInfo(itemEl);

  // --- CRAFTABILITY DETECTION ---
  const isUncraft = itemEl.classList.contains("uncraft");

  // --- AUSTRALIUM DETECTION ---
  const dataTitle = itemEl.getAttribute("data-title") || "";
  //const imgUrl = itemEl.style.backgroundImage || "";

  console.log("dataTitle " + dataTitle);
  console.log("name ", name);

  const isAustralium =
    name.includes("Australium") || dataTitle.includes("Australium");

  // --- FESTIVIZED DETECTION --- (same text-match approach as Australium)
  const isFestivizedItem = isFestivized();
  const festivizedPrefix = isFestivizedItem ? "Festivized " : "";

  // === STRANGE PART SAFEGUARD ===
  const isStrangePart = /^Strange Part:/i.test(name);

  // --- CLEAN NAME LOGIC ---
  // Strip Festivized/killstreak-tier/quality prefixes from the front,
  // repeatedly — items can stack more than one (e.g. "Collector's
  // Festivized Professional Killstreak Beggar's Bazooka"), and a single
  // one-shot regex only ever catches whichever one happens to be first.
  let baseName = name;

  if (!isStrangePart) {
    const PREFIX_PATTERNS = [
      /^Festivized\s+/i,
      /^(?:Killstreak|Specialized Killstreak|Professional Killstreak)\s+/i,
      /^(?:Strange|Vintage|Collector's)\s+/i,
    ];
    let stripped = true;
    while (stripped) {
      stripped = false;
      for (const pattern of PREFIX_PATTERNS) {
        const next = baseName.replace(pattern, "");
        if (next !== baseName) {
          baseName = next;
          stripped = true;
        }
      }
    }
  }

  // Remove "Australium " — not part of the bare schema name the
  // query-param-based links (Next Bp Stats, marketplace.tf) expect
  const classifiedsName = baseName.replace(/^Australium /i, "");

  // Full descriptive name (Festivized + killstreak tier + item name) —
  // Steam's own order is Festivized, then killstreak tier, then the item
  // name. Used by anything that wants the whole name in one piece:
  // classic Bp Stats, Steam Market, mannco.store.
  const fullDisplayName = festivizedPrefix + ksPrefix + baseName;

  // mannco.store wants the Unusual effect name prepended (Steam's own
  // item name never includes it) — skip the link if we couldn't find one.
  // Non-Unusual: pass quality straight through, steamMarketUrl()/mannCoStoreUrl()
  // add the quality word themselves if fullDisplayName's missing it.
  const manncoHref = qualityName === "Unusual"
    ? (unusualEffectName ? mannCoStoreUrl({ name: baseName, effectName: unusualEffectName }) : null)
    : mannCoStoreUrl({ name: fullDisplayName, quality: qualityName });

  // marketplace.tf needs a network fetch (defindex lookup) — don't let a
  // failure there (offline, blocked request, etc.) take down every other
  // link in the modal.
  let marketplaceHref = null;
  try {
    marketplaceHref = await marketplaceTfUrl({
      name: classifiedsName, quality: qualityName, craftable: !isUncraft, ksTier, australium: isAustralium, festive: isFestivizedItem,
    });
  } catch (err) {
    console.warn("[TF2Utils] marketplace.tf link failed:", err);
  }

  const links = [
    {
      label: "Bp Stats",
      href: backpackStatsUrl({ name: fullDisplayName, quality: qualityName, craftable: !isUncraft }),
    },
    {
      label: "Next Bp Stats",
      href: backpackStatsUrl({
        name: classifiedsName, quality: qualityName, craftable: !isUncraft, ksTier, australium: isAustralium, next: true,
      }),
    },
    {
      label: "mannco.store",
      href: manncoHref,
    },
    {
      label: "marketplace.tf",
      href: marketplaceHref,
    },
    {
      label: "Steam Market",
      href: steamMarketUrl(fullDisplayName, qualityName),
    },
    {
      label: "Wiki",
      href: wikiUrl(baseName),
    },
  ];

  return links.filter((link) => link.href);
}

/** Killstreak tier prefix + numeric tier from an item's CSS classes — shared by updateModal() (display name) and makeLinks() (URL building). */
function getKillstreakInfo(itemEl) {
  if (itemEl.classList.contains("killstreak3")) return { prefix: "Professional Killstreak ", tier: 3 };
  if (itemEl.classList.contains("killstreak2")) return { prefix: "Specialized Killstreak ", tier: 2 };
  if (itemEl.classList.contains("killstreak1")) return { prefix: "Killstreak ", tier: 1 };
  return { prefix: "", tier: 0 };
}

/**
 * "Festivized" isn't part of the item's name at all (unlike Strange/
 * Australium/etc.) — it's a separate indicator line inside the hover
 * tooltip's content, same place the Unusual "Effect: X" line lives
 * (see getUnusualEffectName()), e.g.
 * `<span style="color:#FFD700;">Festivized</span>`.
 */
function isFestivized() {
  const hoverEl = document.querySelector(".hover-over");
  if (!hoverEl || hoverEl.style.display === "none") return false;

  const contentEl = hoverEl.querySelector(".hover-over-content");
  if (!contentEl) return false;

  return contentEl.textContent.includes("Festivized");
}

/* Function to extract the effect name */
function getUnusualEffectName() {
  const hoverEl = document.querySelector(".hover-over");
  if (!hoverEl || hoverEl.style.display === "none") return null;

  const contentEl = hoverEl.querySelector(".hover-over-content");
  if (!contentEl) return null;

  // Convert <br> into newlines, then strip any remaining tags.
  const text = contentEl.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();

  // Grab ONLY the effect line
  const match = text.match(/^Effect:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}
