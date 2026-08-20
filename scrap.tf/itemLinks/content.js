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

import { COLOR_PANEL_BG, SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import { ITEM_NAME_QUIRKS } from "../../utils/constants/itemNameQuirks.js";
import { TF2_KS_SHEEN_IDS, TF2_KS_KILLSTREAKER_IDS } from "../../utils/constants/tf2Economy.js";
import { steamMarketUrl, backpackStatsUrl, backpackClassifiedsUrl, mannCoStoreUrl, marketplaceTfUrl, merchantTfUrl, gladiatorTfUrl, pricedbUrl, liquidTfUrl, skinportUrl, crateTfUrl, wikiUrl } from "../../utils/itemLinks.js";
import { getKnownCrateNumber, IS_CRATE_CASE_RE } from "../../utils/tf2ItemSchema.js";
import { getSettings } from "../../utils/settings.js";
import { loadIconSvg } from "../../utils/icons.js";

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

// A distinct accent color per destination site, so the row reads as a
// set of different places rather than one undifferentiated button mass
// — same pattern as the other itemLinks scripts' own LINK_ACCENTS.
const LINK_ACCENTS = {
  "Bp Stats": SITE_BRAND_COLORS.backpackTf,
  "Specific Bp Classifieds": SITE_BRAND_COLORS.backpackTf,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "merchant.tf": SITE_BRAND_COLORS.merchantTf,
  "gladiator.tf": SITE_BRAND_COLORS.gladiatorTf,
  "pricedb.io": SITE_BRAND_COLORS.pricedb,
  "liquid.tf": SITE_BRAND_COLORS.liquidTf,
  "Steam Market": SITE_BRAND_COLORS.steam,
  "Wiki": SITE_BRAND_COLORS.wiki,
};

/** Copies the item's display name to the clipboard, briefly swapping the button's icon to a checkmark (same copy/check icons stntrading.eu/copyClipboard uses) to confirm it worked. */
function copyNameToClipboard(name, btn, copySvg, checkSvg) {
  navigator.clipboard.writeText(name)
    .then(() => {
      btn.innerHTML = checkSvg;
      btn.classList.add("tf2utils-mini-modal-copy-btn--done");
      setTimeout(() => {
        btn.innerHTML = copySvg;
        btn.classList.remove("tf2utils-mini-modal-copy-btn--done");
      }, 1200);
    })
    .catch((err) => console.warn("[TF2Utils] Failed to copy name:", err));
}

export function addItemLinks() {
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
    #tf2utils-mini-modal .tf2utils-mini-modal-name{ font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    #tf2utils-mini-modal .tf2utils-mini-modal-name-text{ overflow-wrap:anywhere; }
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
    #tf2utils-mini-modal .tf2utils-mini-modal-copy-btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
      width:24px;
      height:24px;
      padding:0;
      cursor:pointer;
    }
    /* [hidden] alone loses to the rule above (higher specificity: id +
       class beats a bare attribute selector), so the copy button stayed
       visible with no item selected — this wins the tie back. */
    #tf2utils-mini-modal .tf2utils-mini-modal-copy-btn[hidden]{ display:none; }
    #tf2utils-mini-modal .tf2utils-mini-modal-copy-btn svg{ display:block; }
    #tf2utils-mini-modal .tf2utils-mini-modal-copy-btn--done{ color:#2e8b40; }
  `;
  document.head.appendChild(style);

  // Create the persistent modal
  const modal = document.createElement("div");
  modal.id = "tf2utils-mini-modal";
  modal.innerHTML = `
    <div class="tf2utils-mini-modal-name">
      <span class="tf2utils-mini-modal-name-text">Middle-click or Ctrl+click an item…</span>
      <button type="button" class="btn tf2utils-mini-modal-copy-btn" title="Copy item name" aria-label="Copy item name" hidden></button>
    </div>
    <div class="tf2utils-mini-modal-btns"></div>
  `;
  document.documentElement.appendChild(modal);

  // Loaded once and cached (loadIconSvg() itself caches per icon name
  // too) — by the time the user middle-clicks/ctrl-clicks an item, this
  // has almost always already resolved, so updateModal() below can use
  // it synchronously instead of re-awaiting on every click.
  const copyBtn = modal.querySelector(".tf2utils-mini-modal-copy-btn");
  let copySvg = "";
  let checkSvg = "";
  Promise.all([loadIconSvg("copy"), loadIconSvg("check")])
    .then(([copy, check]) => {
      copySvg = copy;
      checkSvg = check;
      copyBtn.innerHTML = copySvg;
    })
    .catch((err) => console.warn("[TF2Utils] Failed to load copy icon:", err));

  function updateModal(name, itemEl) {
    const nameText = modal.querySelector(".tf2utils-mini-modal-name-text");
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
    nameText.textContent = displayName;
    copyBtn.hidden = false;
    copyBtn.onclick = () => copyNameToClipboard(displayName, copyBtn, copySvg, checkSvg);
    classBtns.innerHTML = "";

    makeLinks(name, itemEl)
      .then((links) => {
        links.forEach(({ label, href }) => {
          const btn = document.createElement("a");
          btn.className = "btn";
          btn.textContent = label;
          btn.href = href;
          btn.target = "_blank";
          btn.style.borderLeft = `3px solid ${LINK_ACCENTS[label] || "#999"}`;
          classBtns.appendChild(btn);
        });
      })
      .catch((err) => console.warn("[TF2Utils] Failed to build item links:", err));
  }

  // Confirms the tooltip container exists on this page at all.
  const selectedHoverEl = document.querySelector(".hover-over");
  if (!selectedHoverEl) {
    console.warn("[TF2Utils] Scrap.tf hover-over not found.");
    return;
  }

  // Updates the modal when the user middle-clicks or ctrl/cmd-clicks an
  // item — nothing needs tracking between events, since the click
  // itself lands on the item, unlike a separate hover-driven flow.
  document.addEventListener(
    "mousedown",
    (e) => {
      const item = e.target.closest(".item.hoverable");
      if (!item) return;

      //Check eaither if is pressing the mouse wheel or the control
      //CtrlKey: Windows/linux, metaKey: Mac
      const isActivate =
        e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      //Verify if one of the 2 options were pressed in order to update the modal
      if (!isActivate) return;

      const selectedHoverEl = document.querySelector(".hover-over");
      if (!selectedHoverEl) return;

      // tooltip must be visible (Scrap uses display:none)
      if (selectedHoverEl.style.display === "none") return;

      const titleSpan = selectedHoverEl.querySelector(".hover-over-title span");
      const titleDiv = selectedHoverEl.querySelector(".hover-over-title");

      const rawName = (
        titleSpan?.textContent ||
        titleDiv?.textContent ||
        ""
      ).trim();
      const name = SCRAP_TF_NAME_CORRECTIONS[rawName] || rawName;

      if (!name) return;

      // update modal
      updateModal(name, item);

      // prevent auto-scroll(mouse wheel)  or redirection to new page(ctrl)
      e.preventDefault();
    },
    true
  );
}

/* 
Function to create the links to be displayed
@args:
  - name: Name of the item
  - itemEl: HTML item element (get more information about the item, ks, paint, unu effect)
*/
async function makeLinks(name, itemEl) {
  const settings = await getSettings();

  // --- QUALITY DETECTION ---
  // Default: Unique
  let qualityName = "Unique";
  let unusualEffectName = null;

  // A switch needs one case per class — which also fixes two bugs the
  // old if-chain had from duplicated conditions: quality0 was checked
  // twice ("Normal" then unconditionally overwritten to "Self Made",
  // so Normal items were always mislabeled and real Self-Made items,
  // quality id 9 not 0, were never detected), and quality14 likewise
  // ("Haunted" then overwritten to "Collector's" — Haunted is quality
  // id 13, not 14, so it was never actually reachable either way).
  const qualityClass = [...itemEl.classList].find((c) => c.startsWith("quality"));
  switch (qualityClass) {
    case "quality0":
      qualityName = "Normal";
      break;
    case "quality1":
      qualityName = "Genuine";
      break;
    case "quality3":
      qualityName = "Vintage";
      break;
    case "quality5":
      qualityName = "Unusual";
      unusualEffectName = getUnusualEffectName(itemEl);
      break;
    case "quality6":
      qualityName = "Unique";
      break;
    case "quality9":
      qualityName = "Self-Made";
      break;
    case "quality11":
      qualityName = "Strange";
      break;
    case "quality13":
      qualityName = "Haunted";
      break;
    case "quality14":
      qualityName = "Collector's";
      break;
  }

  // --- KILLSTREAK DETECTION ---
  const { prefix: ksPrefix, tier: ksTier } = getKillstreakInfo(itemEl);

  // --- SHEEN / KILLSTREAKER DETECTION ---
  const sheenName = getSheenName();
  const killstreakerName = getKillstreakerName();

  // --- CRAFTABILITY DETECTION ---
  const isUncraft = itemEl.classList.contains("uncraft") || isUncraftable();

  // --- AUSTRALIUM DETECTION ---
  const dataTitle = itemEl.getAttribute("data-title") || "";
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
  // query-param-based links (next.backpack.tf stats, marketplace.tf) expect
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

  // marketplace.tf/pricedb.io/liquid.tf/crate.tf all need a network
  // fetch (defindex schema lookup) — each isolates its own failure
  // (offline, blocked request, etc.) with .catch() so one destination
  // going down never takes the others with it.
  //
  // crateNumber specifically is resolved once up front (not just inside
  // crate.tf's own entry below), since merchant.tf/gladiator.tf/
  // pricedb.io/liquid.tf all want it too. scrap.tf's tooltip title never
  // shows the series/case number as literal text the way backpack.tf's
  // does, so this always goes through the bundled series-number table —
  // same fallback steamcommunity.com/itemLinks uses for the same reason
  // — which only resolves names with exactly one known series (see
  // getKnownCrateNumber()'s own docs).
  const crateNumber = await getKnownCrateNumber(classifiedsName).catch((err) => {
    console.warn("[TF2Utils] crate series number lookup failed:", err);
    return undefined;
  });

  // crateTfUrl() itself has no "is this actually a crate" check — it
  // trusts the caller. Without this gate, any non-craftable non-crate
  // item (e.g. "Non-Craftable Duck Journal") would still resolve a real
  // defindex and get a bogus ".../uncraftable" crate.tf link, since
  // crateNumber == null but craftable is false either way — same bug
  // already fixed in backpack.tf oldUI/newUI with this same check.
  const looksLikeCrate = IS_CRATE_CASE_RE.test(classifiedsName) && !/\bkey\b/i.test(classifiedsName);

  // Resolved as its own step (not inline in the array below) since it
  // needs this extra gate check, not just craftable/crateNumber like
  // the others — kept here, rather than pushed after the array, so the
  // crate.tf button still lands in its usual spot in the row.
  let crateTfHref = null;
  if (looksLikeCrate && (crateNumber != null || isUncraft)) {
    crateTfHref = await crateTfUrl(classifiedsName, undefined, { crateNumber, craftable: !isUncraft })
      .catch((err) => { console.warn("[TF2Utils] crate.tf link failed:", err); return null; });
  }

  const links = [
    // Single "Bp Stats" button, following the popup's "Default bp.tf
    // version" setting — classic and next.backpack.tf need genuinely
    // different fields (see backpackStatsUrl()'s own doc), so both are
    // still built, just only one is ever shown.
    { label: "Bp Stats", href: settings.bpTfVersion === "next"
        ? backpackStatsUrl(classifiedsName, qualityName, { craftable: !isUncraft, ksTier, australium: isAustralium, next: true })
        : backpackStatsUrl(fullDisplayName, qualityName, { craftable: !isUncraft }) },
    // The one destination here with sheen/killstreaker search filters,
    // so it's the only place those are worth resolving to their numeric
    // ids at all.
    { label: "Specific Bp Classifieds", href: backpackClassifiedsUrl(classifiedsName, qualityName, {
        craftable: !isUncraft,
        australium: isAustralium,
        ksTier,
        ksSheen: sheenName ? TF2_KS_SHEEN_IDS[sheenName] : undefined,
        ksKillstreaker: killstreakerName ? TF2_KS_KILLSTREAKER_IDS[killstreakerName] : undefined,
        next: settings.bpTfVersion === "next",
      }) },
    { label: "mannco.store", href: qualityName === "Unusual"
        ? (unusualEffectName ? mannCoStoreUrl(baseName, undefined, { effectName: unusualEffectName }) : null)
        : mannCoStoreUrl(manncoDisplayName, qualityName) },
    { label: "skinport.com", href: qualityName === "Unusual"
        ? null
        : skinportUrl(craftabilityPrefix + festivizedPrefix + ksPrefix + baseName, qualityName) },
    { label: "marketplace.tf", href: await marketplaceTfUrl(classifiedsName, qualityName, {
        craftable: !isUncraft, ksTier, australium: isAustralium, festivized: isFestivizedItem,
      }).catch((err) => { console.warn("[TF2Utils] marketplace.tf link failed:", err); return null; }) },
    { label: "crate.tf", href: crateTfHref },
    { label: "merchant.tf", href: merchantTfUrl(fullDisplayName, qualityName, { craftable: !isUncraft, crateNumber }) },
    { label: "gladiator.tf", href: gladiatorTfUrl(fullDisplayName, qualityName, { craftable: !isUncraft, crateNumber }) },
    { label: "pricedb.io", href: await pricedbUrl(classifiedsName, qualityName, {
        craftable: !isUncraft, ksTier, australium: isAustralium, festivized: isFestivizedItem, crateNumber,
      }).catch((err) => { console.warn("[TF2Utils] pricedb.io link failed:", err); return null; }) },
    { label: "liquid.tf", href: await liquidTfUrl(classifiedsName, qualityName, {
        craftable: !isUncraft, ksTier, australium: isAustralium, effectName: unusualEffectName, crateNumber, isAmbiguousSeries: false,
      }).catch((err) => { console.warn("[TF2Utils] liquid.tf link failed:", err); return null; }) },
    { label: "Steam Market", href: steamMarketUrl(steamMarketName, qualityName) },
    { label: "Wiki", href: wikiUrl(baseName) },
  ].filter((link) => link.href);

  return links;
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
  const selectedHoverEl = document.querySelector(".hover-over");
  if (!selectedHoverEl || selectedHoverEl.style.display === "none") return null;
  return selectedHoverEl.querySelector(".hover-over-content");
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

/** Hover tooltip content as plain text — <br> converted to newlines, every other tag stripped, shared by every single-line extractor below. */
function getHoverContentText() {
  const contentEl = getHoverContentEl();
  if (!contentEl) return null;
  return contentEl.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/** One "<label>: <value>" line out of the hover tooltip's content, e.g. getHoverContentLine("Sheen") -> "Team Shine". */
function getHoverContentLine(label) {
  const text = getHoverContentText();
  if (!text) return null;
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : null;
}

/* Function to extract the effect name */
function getUnusualEffectName() {
  return getHoverContentLine("Effect");
}

/** The killstreak sheen name, e.g. "Team Shine" (Specialized/Professional Killstreak items only). */
function getSheenName() {
  return getHoverContentLine("Sheen");
}

/**
 * The killstreaker effect name, e.g. "Flames" 
 */
function getKillstreakerName() {
  return getHoverContentLine("Killstreaker");
}
