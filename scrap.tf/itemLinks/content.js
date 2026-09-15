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
import { steamMarketUrl, backpackStatsUrl, backpackClassifiedsUrl, mannCoStoreUrl, marketplaceTfUrl, merchantTfUrl, gladiatorTfUrl, pricedbUrl, liquidTfUrl, skinportUrl, crateTfUrl, loadoutTfUrl, wikiUrl } from "../../utils/itemLinks.js";
import { getKnownCrateNumber, resolveDefindex, IS_CRATE_CASE_RE } from "../../utils/tf2ItemSchema.js";
import { ksPrefixFor } from "../../utils/tf2ItemName.js";
import { getUnusualEffectId } from "../../utils/unusualEffects.js";
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
  "loadout.tf": SITE_BRAND_COLORS.loadoutTf,
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

  function updateModal(itemName, itemEl) {
    const nameText = modal.querySelector(".tf2utils-mini-modal-name-text");
    const classBtns = modal.querySelector(".tf2utils-mini-modal-btns");

    // Killstreak tier, Festivized and Non-Craftable don't always show up
    // as literal text in the tooltip name (same issue as Genuine
    // quality) — add them if missing. Order: Non-Craftable, then
    // Festivized, then Killstreak tier, then the item name.
    const { prefix: ksPrefix } = getKillstreakInfo(itemEl);
    const isUncraftItem = itemEl.classList.contains("uncraft") || isUncraftable();
    let displayName = itemName;
    if (ksPrefix && !displayName.includes(ksPrefix.trim())) displayName = ksPrefix + displayName;
    if (isFestivized() && !displayName.includes("Festivized")) displayName = "Festivized " + displayName;
    if (isUncraftItem && !displayName.includes("Non-Craftable") && !displayName.includes("Uncraftable")) {
      displayName = "Non-Craftable " + displayName;
    }
    nameText.textContent = displayName;
    copyBtn.hidden = false;
    copyBtn.onclick = () => copyNameToClipboard(displayName, copyBtn, copySvg, checkSvg);
    classBtns.innerHTML = "";

    buildLinks(itemName, itemEl)
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
      const itemName = SCRAP_TF_NAME_CORRECTIONS[rawName] || rawName;

      if (!itemName) return;

      // update modal
      updateModal(itemName, item);

      // prevent auto-scroll(mouse wheel)  or redirection to new page(ctrl)
      e.preventDefault();
    },
    true
  );
}

/**
 * Reads the item's full set of attributes off both its CSS classes
 * (quality/killstreak tier/craftability — this page's DOM signal for
 * those, unlike every other itemLinks script here, which reads them out
 * of the name text alone) and the hover tooltip's own content text
 * (Festivized/Uncraftable/Effect/Sheen/Killstreaker — none of those are
 * part of the item's own name here either — see isFestivized()'s own
 * doc). `itemName` itself is only ever the tooltip title's raw text —
 * used here just to detect Australium/Strange Part (the two signals
 * that ARE baked into it) and as the base string every prefix below
 * gets stripped from.
 *
 * Every field is always present on the returned object — one this page
 * genuinely can't determine (there's no crate/case series number shown
 * here as literal text at all, only through the bundled fallback table
 * — see getKnownCrateNumber()'s own doc for why that means
 * isAmbiguousSeries is always false here) is `null` rather than
 * omitted. `festivized`/`ksSheen`/`ksKillstreaker` are extra fields
 * beyond the shared shape — this file's own Specific Bp Classifieds
 * link needs the sheen/killstreaker ids, and marketplace.tf/pricedb.io
 * need festivized as their own sku modifier, unlike every other
 * destination this file builds.
 *
 * @param {string} itemName - the hover tooltip's own title text
 * @param {Element} itemEl - the hovered/clicked item element (CSS classes)
 * @returns {Promise<{name: string, quality: string, craftable: boolean, ksTier: number|null, australium: boolean, effectId: string|null, effectName: string|null, crateNumber: number|null, isAmbiguousSeries: boolean, festivized: boolean, ksSheen: string|null, ksKillstreaker: string|null}>}
 */
async function parseItemAttributes(itemName, itemEl) {
  // A switch needs one case per class — which also fixes two bugs the
  // old if-chain had from duplicated conditions: quality0 was checked
  // twice ("Normal" then unconditionally overwritten to "Self Made",
  // so Normal items were always mislabeled and real Self-Made items,
  // quality id 9 not 0, were never detected), and quality14 likewise
  // ("Haunted" then overwritten to "Collector's" — Haunted is quality
  // id 13, not 14, so it was never actually reachable either way).
  let quality = "Unique";
  let effectName = null;
  const qualityClass = [...itemEl.classList].find((c) => c.startsWith("quality"));
  switch (qualityClass) {
    case "quality0":
      quality = "Normal";
      break;
    case "quality1":
      quality = "Genuine";
      break;
    case "quality3":
      quality = "Vintage";
      break;
    case "quality5":
      quality = "Unusual";
      effectName = getUnusualEffectName();
      break;
    case "quality6":
      quality = "Unique";
      break;
    case "quality9":
      quality = "Self-Made";
      break;
    case "quality11":
      quality = "Strange";
      break;
    case "quality13":
      quality = "Haunted";
      break;
    case "quality14":
      quality = "Collector's";
      break;
  }

  const { tier: ksTier } = getKillstreakInfo(itemEl);
  const ksSheen = getSheenName();
  const ksKillstreaker = getKillstreakerName();
  const craftable = !(itemEl.classList.contains("uncraft") || isUncraftable());

  const dataTitle = itemEl.getAttribute("data-title") || "";
  const australium = itemName.includes("Australium") || dataTitle.includes("Australium");

  const festivized = isFestivized();

  // === STRANGE PART SAFEGUARD ===
  const isStrangePart = /^Strange Part:/i.test(itemName);

  // --- CLEAN NAME LOGIC ---
  // Strip Festivized/killstreak-tier/quality prefixes from the front,
  // repeatedly — items can stack more than one (e.g. "Collector's
  // Festivized Professional Killstreak Beggar's Bazooka"), and a single
  // one-shot regex only ever catches whichever one happens to be first.
  let baseName = itemName;

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
    if (quality === "Strange" || quality === "Vintage" || quality === "Collector's") {
      const escaped = quality.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  // Bare schema name — Australium also removed, not part of it the way
  // the query-param-based links (next.backpack.tf stats, marketplace.tf,
  // pricedb.io, liquid.tf, crate.tf) expect. buildLinks() below
  // reconstructs baseName (Australium kept) separately for the
  // destinations that want it baked back in as text (classic Bp Stats,
  // merchant.tf/gladiator.tf, Steam Market, mannco.store, Wiki).
  const name = baseName.replace(/^Australium /i, "");

  // scrap.tf's tooltip title never shows a crate/case's series number as
  // literal text the way backpack.tf's does, so this always goes through
  // the bundled fallback table — same reasoning steamcommunity.com/
  // itemLinks falls back to it for. Only ever resolves a name mapped to
  // exactly one known series (see getKnownCrateNumber()'s own doc), so
  // there's no way to tell a genuinely ambiguous multi-series name apart
  // from an unmapped one from this page alone — isAmbiguousSeries is
  // always false here.
  const crateNumber = await getKnownCrateNumber(name).catch((err) => {
    console.warn("[TF2Utils] crate series number lookup failed:", err);
    return null;
  }) ?? null;

  // The tooltip's "Effect: <name>" line already gives the exact effect
  // name reliably (unlike stntrading.eu/itemLinks, which has to guess it
  // by scanning the item's whole display name for a substring match) —
  // an exact-match reverse lookup against the same bundled effect data
  // is enough to also resolve its numeric id, which liquid.tf's own slug
  // wants (see liquidTfUrl()'s own doc).
  const effectId = effectName ? await getUnusualEffectId(effectName) : null;

  return {
    name, quality, craftable, ksTier, australium, effectId, effectName,
    crateNumber, isAmbiguousSeries: false, festivized, ksSheen, ksKillstreaker,
  };
}


/**
 * Builds every reference link for the item — Bp Stats/loadout.tf/
 * Specific Bp Classifieds/mannco.store/skinport.com/marketplace.tf/
 * crate.tf/merchant.tf/gladiator.tf/pricedb.io/liquid.tf/Steam Market/
 * Wiki — as one array, all resolved together before anything renders.
 * @param {string} itemName - the hover tooltip's own title text
 * @param {Element} itemEl - the hovered/clicked item element
 */
async function buildLinks(itemName, itemEl) {
  const settings = await getSettings();
  const attrs = await parseItemAttributes(itemName, itemEl);

  const ksPrefix = ksPrefixFor(attrs.ksTier);
  const festivizedPrefix = attrs.festivized ? "Festivized " : "";

  // Steam Market and mannco.store don't have a separate craftability
  // field — like Festivized/killstreak, "Non-Craftable" doesn't show up
  // as literal text in the tooltip name at all (confirmed: Duck Journal's
  // title is just "Duck Journal"), so it's added here from attrs.craftable.
  // mannCoStoreUrl() converts "Non-Craftable" text into "uncraftable" in
  // the slug itself.
  const craftabilityPrefix = attrs.craftable ? "" : "Non-Craftable ";

  // baseName: attrs.name with Australium re-added as text — needed for
  // the destinations that want it baked in (classic Bp Stats,
  // merchant.tf/gladiator.tf, Steam Market, mannco.store, Wiki), unlike
  // the query-param-based ones, which take attrs.australium separately.
  const baseName = attrs.australium ? `Australium ${attrs.name}` : attrs.name;

  // Full descriptive name (Festivized + killstreak tier + item name) —
  // Steam's own order is Festivized, then killstreak tier, then the item
  // name. Used for classic Bp Stats, which takes craftability as its own
  // separate URL field (craftable: attrs.craftable below) — Non-Craftable
  // must NOT be baked into this one, or Bp Stats would end up saying it
  // twice.
  const fullDisplayName = festivizedPrefix + ksPrefix + baseName;
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

  // crateTfUrl() itself has no "is this actually a crate" check — it
  // trusts the caller. Without this gate, any non-craftable non-crate
  // item (e.g. "Non-Craftable Duck Journal") would still resolve a real
  // defindex and get a bogus ".../uncraftable" crate.tf link, since
  // attrs.crateNumber == null but craftable is false either way — same
  // bug already fixed in backpack.tf oldUI/newUI with this same check.
  const looksLikeCrate = IS_CRATE_CASE_RE.test(attrs.name) && !/\bkey\b/i.test(attrs.name);

  // Resolved as its own step (not inline in the array below) since it
  // needs this extra gate check, not just craftable/crateNumber like
  // the others — kept here, rather than pushed after the array, so the
  // crate.tf button still lands in its usual spot in the row.
  let crateTfHref = null;
  if (looksLikeCrate && (attrs.crateNumber != null || !attrs.craftable)) {
    crateTfHref = await crateTfUrl(attrs.name, undefined, { crateNumber: attrs.crateNumber, craftable: attrs.craftable })
      .catch((err) => { console.warn("[TF2Utils] crate.tf link failed:", err); return null; });
  }

  // loadout.tf only ever applies to Unusuals with a resolved effect —
  // resolved as its own step since it needs a defindex lookup, not
  // just attrs like most of the array below.
  let loadoutTfHref = null;
  if (attrs.quality === "Unusual" && attrs.effectId) {
    const defindex = await resolveDefindex(attrs.name).catch((err) => {
      console.warn("[TF2Utils] loadout.tf defindex lookup failed:", err);
      return null;
    });
    if (defindex != null) loadoutTfHref = loadoutTfUrl(defindex, attrs.effectId);
  }

  const links = [
    // Single "Bp Stats" button, following the popup's "Default bp.tf
    // version" setting — classic and next.backpack.tf need genuinely
    // different fields (see backpackStatsUrl()'s own doc), so both are
    // still built, just only one is ever shown.
    { label: "Bp Stats", href: settings.bpTfVersion === "next"
        ? backpackStatsUrl(attrs.name, attrs.quality, { craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, next: true })
        : backpackStatsUrl(fullDisplayName, attrs.quality, { craftable: attrs.craftable }) },
    { label: "loadout.tf", href: loadoutTfHref },
    // The one destination here with sheen/killstreaker search filters,
    // so it's the only place those are worth resolving to their numeric
    // ids at all.
    { label: "Specific Bp Classifieds", href: backpackClassifiedsUrl(attrs.name, attrs.quality, {
        craftable: attrs.craftable,
        australium: attrs.australium,
        ksTier: attrs.ksTier,
        ksSheen: attrs.ksSheen ? TF2_KS_SHEEN_IDS[attrs.ksSheen] : undefined,
        ksKillstreaker: attrs.ksKillstreaker ? TF2_KS_KILLSTREAKER_IDS[attrs.ksKillstreaker] : undefined,
        next: settings.bpTfVersion === "next",
      }) },
    { label: "mannco.store", href: attrs.quality === "Unusual"
        ? (attrs.effectName ? mannCoStoreUrl(baseName, undefined, { effectName: attrs.effectName }) : null)
        : mannCoStoreUrl(manncoDisplayName, attrs.quality) },
    { label: "skinport.com", href: attrs.quality === "Unusual"
        ? null
        : skinportUrl(craftabilityPrefix + festivizedPrefix + ksPrefix + baseName, attrs.quality) },
    { label: "marketplace.tf", href: await marketplaceTfUrl(attrs.name, attrs.quality, {
        craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, festivized: attrs.festivized,
      }).catch((err) => { console.warn("[TF2Utils] marketplace.tf link failed:", err); return null; }) },
    { label: "crate.tf", href: crateTfHref },
    { label: "merchant.tf", href: merchantTfUrl(fullDisplayName, attrs.quality, { craftable: attrs.craftable, crateNumber: attrs.crateNumber ?? undefined }) },
    { label: "gladiator.tf", href: gladiatorTfUrl(fullDisplayName, attrs.quality, { craftable: attrs.craftable, crateNumber: attrs.crateNumber ?? undefined }) },
    { label: "pricedb.io", href: await pricedbUrl(attrs.name, attrs.quality, {
        craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium, festivized: attrs.festivized, crateNumber: attrs.crateNumber ?? undefined,
      }).catch((err) => { console.warn("[TF2Utils] pricedb.io link failed:", err); return null; }) },
    { label: "liquid.tf", href: await liquidTfUrl(attrs.name, attrs.quality, {
        craftable: attrs.craftable, ksTier: attrs.ksTier, australium: attrs.australium,
        effectId: attrs.effectId ?? undefined, effectName: attrs.effectName ?? undefined,
        crateNumber: attrs.crateNumber ?? undefined, isAmbiguousSeries: attrs.isAmbiguousSeries,
      }).catch((err) => { console.warn("[TF2Utils] liquid.tf link failed:", err); return null; }) },
    { label: "Steam Market", href: steamMarketUrl(steamMarketName, attrs.quality) },
    { label: "Wiki", href: settings.showWikiLink ? wikiUrl(baseName) : null },
  ].filter((link) => link.href);

  return links;
}

/** Killstreak tier prefix + numeric tier from an item's CSS classes — shared by updateModal() (display name) and parseItemAttributes() (URL building). */
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
