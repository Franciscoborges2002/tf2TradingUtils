/* 
@TF2TradingUtils
*/

export function scrapHoverItemLinks() {
  let lastHoveredItem = null;
  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    #tf2utils-mini-modal{
      position:fixed; left:12px; bottom:12px; z-index:2147483647;
      padding:10px 12px; border-radius:10px; background:#111; color:#fff;
      border:1px solid #2a2a2a; box-shadow:0 8px 20px rgba(0,0,0,.35);
      font:12px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial;
      max-width:260px; display:block;
    }
    #tf2utils-mini-modal .ttl{
      font-weight:700; margin-bottom:8px;
    }
    #tf2utils-mini-modal .row{
      display:flex; gap:8px; flex-wrap:wrap;
    }
    #tf2utils-mini-modal .btn{
      border:1px solid #2e2e2e; background:#1b1b1b; color:#eaeaea;
      padding:5px 8px; border-radius:6px;
      text-decoration:none; font-size:12px;
    }
    #tf2utils-mini-modal .btn:hover{
      background:#222;
    }
  `;
  document.head.appendChild(style);

  // Create the persistent modal
  const modal = document.createElement("div");
  modal.id = "tf2utils-mini-modal";
  modal.innerHTML = `
    <div class="ttl">Hover an item…</div>
    <div class="row"></div>
  `;
  document.documentElement.appendChild(modal);

  // Update modal content
  function updateModal(name) {
    const ttl = modal.querySelector(".ttl");
    const row = modal.querySelector(".row");

    ttl.textContent = name;
    row.innerHTML = "";

    makeLinks(name, lastHoveredItem).forEach(({ label, href }) => {
      const btn = document.createElement("a");
      btn.className = "btn";
      btn.textContent = label;
      btn.href = href;
      btn.target = "_blank";
      row.appendChild(btn);
    });
  }

  // Watch for Scrap.tf hover tooltip becoming visible
  const hoverEl = document.querySelector(".hover-over");

  if (!hoverEl) {
    console.warn("[TF2Utils] Scrap.tf hover-over not found.");
    return;
  }

  // Observe changes to hover-over style (Scrap.tf toggles inline display)
  const observer = new MutationObserver(() => {
    const display = hoverEl.style.display;

    if (display !== "none") {
      const nameEl =
        hoverEl.querySelector(".hover-over-title span") ||
        hoverEl.querySelector(".hover-over-title");

      if (nameEl) {
        const itemName = nameEl.textContent.trim();

        // Grab the item element THAT CREATED THE HOVER
        lastHoveredItem = document.querySelector(".item.hoverable:hover");

        updateModal(itemName);
      }
    }
  });

  observer.observe(hoverEl, { attributes: true, attributeFilter: ["style"] });

  console.log("[TF2Utils] Hover-observer active.");
}

function makeLinks(name, itemEl) {
  // --- QUALITY DETECTION ---
  // Default: Unique (6)
  let qualityName = "Unique";
  let qualityId = 6;

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
  const imgUrl = itemEl.style.backgroundImage || "";

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
      label: "Stats",
      href: `https://backpack.tf/stats/${qualityName}/${encodedStatsName}/Tradable/${craftPathSegment}`,
    },
    {
      label: "Classifieds",
      href:
        `https://backpack.tf/classifieds?item=${encodedClassifiedsName}` +
        `&quality=${qualityId}&tradable=1&craftable=${craftParam}&australium=${australiumParam}&killstreak_tier=${ksTier}`,
    },
    {
      label: "Wiki",
      href: `https://wiki.teamfortress.com/wiki/${encodeURIComponent(
        baseName
      )}`,
    },
  ];
}
