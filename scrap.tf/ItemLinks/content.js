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
      background: #201c1a;
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
    #tf2utils-mini-modal .btn:hover{ background: #201c1a; }
  `;
  document.head.appendChild(style);

  // Create the persistent modal
  const modal = document.createElement("div");
  modal.id = "tf2utils-mini-modal";
  modal.innerHTML = `
    <div class="tf2utils-mini-modal-name">Hover an item…</div>
    <div class="tf2utils-mini-modal-btns"></div>
  `;
  document.documentElement.appendChild(modal);

  function updateModal(name, itemEl) {
    const className = modal.querySelector(".tf2utils-mini-modal-name");
    const classBtns = modal.querySelector(".tf2utils-mini-modal-btns");

    className.textContent = name;
    classBtns.innerHTML = "";

    makeLinks(name, itemEl).forEach(({ label, href }) => {
      const btn = document.createElement("a");
      btn.className = "btn";
      btn.textContent = label;
      btn.href = href;
      btn.target = "_blank";
      classBtns.appendChild(btn);
    });
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
function makeLinks(name, itemEl) {
  // --- QUALITY DETECTION ---
  // Default: Unique (6)
  let qualityName = "Unique";
  let qualityId = 6;
  let unusualEffectName = null;
  //let unusualEffectId = null;

  if (itemEl.classList.contains("quality0")) {
    qualityName = "Normal";
    qualityId = 0;
  }
  if (itemEl.classList.contains("quality1")) {
    qualityName = "Genuine";
    qualityId = 1;
  }
  if (itemEl.classList.contains("quality3")) {
    qualityName = "Vintage";
    qualityId = 3;
  }
  if (itemEl.classList.contains("quality5")) {
    qualityName = "Unusual";
    qualityId = 5;
    unusualEffectName = getUnusualEffectName(itemEl);
    //unusualEffectId = unusualIdByName[unusualEffectName] ?? null;
    //console.log("unusualEffectId", unusualEffectId);
  }
  if (itemEl.classList.contains("quality6")) {
    qualityName = "Unique";
    qualityId = 6;
  }
  if (itemEl.classList.contains("quality0")) {
    qualityName = "Self Made";
    qualityId = 9;
  }
  if (itemEl.classList.contains("quality11")) {
    qualityName = "Strange";
    qualityId = 11;
  }
  if (itemEl.classList.contains("quality14")) {
    qualityName = "Haunted";
    qualityId = 13;
  }
  if (itemEl.classList.contains("quality14")) {
    qualityName = "Collector's";
    qualityId = 14;
  }

  // --- KILLSTREAK DETECTION ---
  let ksPrefix = "";
  let ksTier = 0; // default "no killstreak" (matches classifieds filters style)

  if (itemEl.classList.contains("killstreak1")) {
    ksPrefix = "Killstreak ";
    ksTier = 1;
  }
  if (itemEl.classList.contains("killstreak2")) {
    ksPrefix = "Specialized Killstreak ";
    ksTier = 2;
  }
  if (itemEl.classList.contains("killstreak3")) {
    ksPrefix = "Professional Killstreak ";
    ksTier = 3;
  }

  // --- CRAFTABILITY DETECTION ---
  const isUncraft = itemEl.classList.contains("uncraft");
  const craftPathSegment = isUncraft ? "Non-Craftable" : "Craftable";
  const craftParam = isUncraft ? -1 : 1;

  // --- AUSTRALIUM DETECTION ---
  const dataTitle = itemEl.getAttribute("data-title") || "";
  //const imgUrl = itemEl.style.backgroundImage || "";

  console.log("dataTitle " + dataTitle);
  console.log("name ", name);

  const isAustralium =
    name.includes("Australium") || dataTitle.includes("Australium");

  const australiumParam = isAustralium ? 1 : -1;

  // === STRANGE PART SAFEGUARD ===
  const isStrangePart = /^Strange Part:/i.test(name);

  // --- CLEAN NAME LOGIC ---
  let baseName = name;

  if (!isStrangePart) {
    // Remove existing killstreak or qualities prefixes from name to avoid duplication
    baseName = name.replace(
      /^(Killstreak |Specialized Killstreak |Professional Killstreak |Strange |Vintage |Collector's )/i,
      ""
    );
  }

  // Remove "Australium " for classifieds
  const classifiedsName = baseName.replace(/^Australium /i, "");

  // Name used for Stats: include KS prefix if any
  const statsName = ksPrefix + baseName;
  const encodedStatsName = encodeURIComponent(statsName);

  // Name used for Classifieds: clean base name (no KS text, KS handled by killstreak_tier)
  const encodedClassifiedsName = encodeURIComponent(classifiedsName);

  return [
    {
      label: "Bp Stats",
      href: `https://backpack.tf/stats/${qualityName}/${encodedStatsName}/Tradable/${craftPathSegment}`,
    },
    {
      label: "Bp Classifieds",
      href:
        `https://backpack.tf/classifieds?item=${encodedClassifiedsName}` +
        `&quality=${qualityId}&tradable=1&craftable=${craftParam}&australium=${australiumParam}&killstreak_tier=${ksTier}`,
    },
    {
      label: "Next Bp Stats",
      href:
        `https://next.backpack.tf/stats?item=${encodedClassifiedsName}` +
        `&quality=${qualityId}&tradable=1&craftable=${craftParam}&${
          isAustralium ? `australium=${australiumParam}` : ``
        }&killstreakTier=${ksTier}`,
    },
    {
      label: "Next Bp Classifieds",
      href:
        `https://next.backpack.tf/classifieds?itemName=${encodedClassifiedsName}` +
        `&quality=${qualityId}&tradable=1&craftable=${craftParam}&australium=${australiumParam}&killstreakTier=${ksTier}`,
    },
    {
      label: "Steam Market",
      href:
        `https://steamcommunity.com/market/listings/440/` +
        `${encodeURIComponent(baseName)}`,
    },
    {
      label: "Wiki",
      href: `https://wiki.teamfortress.com/wiki/${encodeURIComponent(
        baseName
      )}`,
    },
  ];
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
