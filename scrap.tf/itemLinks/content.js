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
import { ITEM_NAME_QUIRKS } from "../../utils/constants/itemNameQuirks.js";
import { steamMarketUrl, backpackStatsUrl, mannCoStoreUrl, marketplaceTfUrl, merchantTfUrl, gladiatorTfUrl, pricedbUrl, liquidTfUrl, skinportUrl, crateTfUrl, getKnownCrateNumber, wikiUrl } from "../../utils/itemLinks.js";

// scrap.tf's own hover tooltip text drops diacritics for at least this
// one item — it literally renders "Quackenbirdt" with no accent at all
// (confirmed against backpack.tf/stntrading.eu, which do show it
// correctly), so every link built from the tooltip text would inherit
// the missing accent. Corrected right where the name is first read out
// of the DOM, before anything downstream (URL builders, the modal's own
// display name) ever sees it.
const SCRAP_TF_NAME_CORRECTIONS = {
  "Quackenbirdt": "Quäckenbirdt",
};

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

    // Killstreak tier, Festivized and Non-Craftable don't always show up
    // as literal text in the tooltip name (same issue as Genuine
    // quality) — add them if missing. Order: Non-Craftable, then
    // Festivized, then Killstreak tier, then the item name.
    const { prefix: ksPrefix } = getKillstreakInfo(itemEl);
    const isUncraftItem = itemEl.classList.contains("uncraft") || isUncraftable();
    let displayName = name;
    if (ksPrefix && !displayName.includes(ksPrefix.trim())) displayName = ksPrefix + displayName;
    if (isFestivized() && !displayName.includes("Festivized")) displayName = "Festivized " + displayName;
    if (isUncraftItem && !displayName.includes("Non-Craftable") && !displayName.includes("Uncraftable")) {
      displayName = "Non-Craftable " + displayName;
    }
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

      const rawName = (
        titleSpan?.textContent ||
        titleDiv?.textContent ||
        ""
      ).trim();
      const name = SCRAP_TF_NAME_CORRECTIONS[rawName] || rawName;
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
  // "Uncraftable" isn't part of the item's name either — same as
  // Festivized, it's a separate indicator line in the hover tooltip's
  // content (e.g. Duck Journal's title is just "Duck Journal", with
  // `<span style="color:rgba(231, 76, 60, 0.8);">Uncraftable</span>`
  // inside .hover-over-content). Checked alongside the CSS class in
  // case one signal is more reliable than the other for a given item.
  const isUncraft = itemEl.classList.contains("uncraft") || isUncraftable();

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
    ];
    // Only strip the quality word if it's the one actually detected via
    // the item's CSS class — some items (e.g. "Strange Count Transfer
    // Tool") have a quality WORD baked into their literal name while
    // their real TF2 quality is Unique. Blindly stripping any
    // "Strange"/"Vintage"/"Collector's" text regardless of the item's
    // real quality would wrongly cut real name text off those.
    if (qualityName === "Strange" || qualityName === "Vintage" || qualityName === "Collector's") {
      const escaped = qualityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      PREFIX_PATTERNS.push(new RegExp(`^${escaped}\\s+`, "i"));
    }
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
  // name. Used for classic Bp Stats, which takes craftability as its own
  // separate URL field (craftable: !isUncraft below) — Non-Craftable
  // must NOT be baked into this one, or Bp Stats would end up saying it
  // twice.
  const fullDisplayName = festivizedPrefix + ksPrefix + baseName;

  // Steam Market and mannco.store don't have a separate craftability
  // field — like Festivized/killstreak, "Non-Craftable" doesn't show up
  // as literal text in the tooltip name at all (confirmed: Duck Journal's
  // title is just "Duck Journal"), so it's added here from isUncraft.
  // mannCoStoreUrl() converts "Non-Craftable" text into "uncraftable" in
  // the slug itself.
  const craftabilityPrefix = isUncraft ? "Non-Craftable " : "";
  const craftableAwareDisplayName = craftabilityPrefix + fullDisplayName;

  // A handful of items have confirmed, non-derivable naming quirks per
  // destination site (e.g. C.A.P.P.E.R needs "The " on Steam Market —
  // but only for the plain, no-killstreak version — and mannco.store
  // uses the short name "Capper" instead). See utils/constants/itemNameQuirks.js.
  const quirk = ITEM_NAME_QUIRKS[baseName];

  const steamMarketName = quirk?.steamMarketOmitsNonCraftablePrefix
    ? fullDisplayName
    : quirk?.steamMarketNeedsThePrefix && !ksPrefix && !baseName.startsWith("The ")
      ? craftabilityPrefix + festivizedPrefix + `The ${baseName}`
      : craftableAwareDisplayName;

  // mannco.store wants the Unusual effect name prepended (Steam's own
  // item name never includes it) — skip the link if we couldn't find one.
  // Non-Unusual: pass quality straight through, steamMarketUrl()/mannCoStoreUrl()
  // add the quality word themselves if fullDisplayName's missing it.
  const manncoBaseName = quirk?.manncoStoreName ?? baseName;
  const manncoDisplayName = quirk?.manncoStoreNeedsThePrefix && !ksPrefix && !manncoBaseName.startsWith("The ")
    ? craftabilityPrefix + festivizedPrefix + `The ${manncoBaseName}`
    : craftabilityPrefix + festivizedPrefix + ksPrefix + manncoBaseName;

  const manncoHref = qualityName === "Unusual"
    ? (unusualEffectName ? mannCoStoreUrl({ name: baseName, effectName: unusualEffectName }) : null)
    : mannCoStoreUrl({ name: manncoDisplayName, quality: qualityName });

  // skinport.com wants the plain descriptive name (Non-Craftable/
  // Festivized/killstreak-tier prefixes included, but NOT mannco.store's
  // own "The "/short-name quirk substitutions — confirmed those don't
  // transfer: skinport.com's own "The " quirk, when it applies at all,
  // only does so for the unqualified name, unlike mannco.store's
  // (see skinportUrl's own doc comment and ITEM_NAME_QUIRKS'
  // skinportNeedsThePrefix). No Unusual effect name is known to belong
  // anywhere in its slug either, so Unusual items are skipped rather
  // than guessed wrong.
  const skinportHref = qualityName === "Unusual"
    ? null
    : skinportUrl({ name: craftabilityPrefix + festivizedPrefix + ksPrefix + baseName, quality: qualityName });

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

  // crate.tf only has pages for crates/cases. scrap.tf's tooltip title
  // never shows the series/case number as literal text the way
  // backpack.tf's does (unlike those, so there's nothing to parse here),
  // so this always goes through the bundled series-number table — same
  // fallback steamcommunity.com/itemLinks uses for the same reason —
  // which only resolves names with exactly one known series (see
  // getKnownCrateNumber()'s own docs).
  let crateTfHref = null;
  let crateNumber;
  try {
    crateNumber = await getKnownCrateNumber(classifiedsName);
    crateTfHref = await crateTfUrl({ name: classifiedsName, crateNumber, craftable: !isUncraft });
  } catch (err) {
    console.warn("[TF2Utils] crate.tf link failed:", err);
  }

  // merchant.tf's "/trade/<slug>" is just a search-bar prefill, not an
  // exact lookup key (see merchantTfUrl()'s own doc) — so unlike
  // mannco.store/skinport.com above, Unusuals aren't skipped here: the
  // effect name (when known) just gets folded into the search text for
  // a narrower result instead of being required for a match.
  const merchantSearchName = qualityName === "Unusual" && unusualEffectName
    ? `${unusualEffectName} ${fullDisplayName}`
    : fullDisplayName;
  const merchantHref = merchantTfUrl({ name: merchantSearchName, quality: qualityName, craftable: !isUncraft, crateNumber });

  // pricedb.io needs the same defindex schema lookup marketplace.tf
  // does — same failure isolation as that block above.
  let pricedbHref = null;
  try {
    pricedbHref = await pricedbUrl({
      name: classifiedsName, quality: qualityName, craftable: !isUncraft, ksTier, australium: isAustralium, festive: isFestivizedItem, crateNumber,
    });
  } catch (err) {
    console.warn("[TF2Utils] pricedb.io link failed:", err);
  }

  // liquid.tf needs the same defindex schema lookup — same failure
  // isolation as the blocks above. No effectId here (same gap
  // marketplaceHref/pricedbHref above already have — scrap.tf's tooltip
  // only exposes the effect NAME, not its numeric id), and
  // isAmbiguousSeries is always false — same reasoning as crateTfHref's
  // own comment above: scrap.tf's tooltip title never shows a crate's
  // series number as literal text, so there's nothing genuine to echo
  // into the slug.
  let liquidTfHref = null;
  try {
    liquidTfHref = await liquidTfUrl({
      name: classifiedsName, quality: qualityName, craftable: !isUncraft, ksTier, australium: isAustralium, effectName: unusualEffectName, crateNumber, isAmbiguousSeries: false,
    });
  } catch (err) {
    console.warn("[TF2Utils] liquid.tf link failed:", err);
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
      label: "skinport.com",
      href: skinportHref,
    },
    {
      label: "marketplace.tf",
      href: marketplaceHref,
    },
    {
      label: "crate.tf",
      href: crateTfHref,
    },
    {
      label: "merchant.tf",
      href: merchantHref,
    },
    {
      label: "gladiator.tf",
      href: gladiatorTfUrl({ name: fullDisplayName, quality: qualityName, craftable: !isUncraft, crateNumber }),
    },
    {
      label: "pricedb.io",
      href: pricedbHref,
    },
    {
      label: "liquid.tf",
      href: liquidTfHref,
    },
    {
      label: "Steam Market",
      href: steamMarketUrl(steamMarketName, qualityName),
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
 * The currently-visible hover tooltip's content element, or null if
 * there isn't one — shared by isFestivized(), isUncraftable() and
 * getUnusualEffectName(), which all read indicator lines out of it
 * (Festivized/Uncraftable/"Effect: X" are none of them part of the
 * item's own name — see isFestivized() for why).
 */
function getHoverContentEl() {
  const hoverEl = document.querySelector(".hover-over");
  if (!hoverEl || hoverEl.style.display === "none") return null;
  return hoverEl.querySelector(".hover-over-content");
}

/**
 * "Festivized" isn't part of the item's name at all (unlike Strange/
 * Australium/etc.) — it's a separate indicator line inside the hover
 * tooltip's content, e.g. `<span style="color:#FFD700;">Festivized</span>`.
 */
function isFestivized() {
  const contentEl = getHoverContentEl();
  return contentEl ? contentEl.textContent.includes("Festivized") : false;
}

/**
 * Same story as isFestivized() — "Uncraftable" isn't part of the name
 * either (e.g. Duck Journal's title is just "Duck Journal"), it's
 * `<span style="color:rgba(231, 76, 60, 0.8);">Uncraftable</span>`
 * inside the hover tooltip's content.
 */
function isUncraftable() {
  const contentEl = getHoverContentEl();
  return contentEl ? contentEl.textContent.includes("Uncraftable") : false;
}

/* Function to extract the effect name */
function getUnusualEffectName() {
  const contentEl = getHoverContentEl();
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
