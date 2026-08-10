import { TF2_CURRENCY } from "../utils/constants/tf2Economy.js";

// Shared with the settings and calculator views below — the key price
// (in ref) from chrome.storage.local, kept in sync across both without
// needing a full message/event system since they live in the same
// popup instance.
let currentKeyPriceRef = null;
let onKeyPriceChanged  = () => {};

chrome.storage.local.get(["settings"], (result) => {
  currentKeyPriceRef = result.settings?.keyPriceRef || null;
  onKeyPriceChanged();
});

(() => {
  const { version } = chrome.runtime.getManifest();
  const badge = document.getElementById("version-badge");
  if (badge) badge.textContent = `v${version}`;
})();

document.addEventListener("DOMContentLoaded", async () => {
  const hostEl      = document.getElementById("host");
  const scriptListEl = document.getElementById("scripts-list");
  const statusBadge  = document.getElementById("status-badge");

  function setInactive(message) {
    // Badge
    statusBadge.textContent = "inactive";
    statusBadge.className   = "badge badge--inactive";

    // Body
    scriptListEl.innerHTML = `
      <div id="inactive-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${message}</p>
      </div>`;
  }

  function setActive(site, scripts) {
    // Badge
    statusBadge.textContent = "active";
    statusBadge.className   = "badge badge--active";

    // Host label
    if (hostEl) hostEl.textContent = site;

    // Script rows
    scriptListEl.innerHTML = "";

    scripts.forEach((script) => {
      const [name, repoUrl] = script;

      const wrapper = document.createElement("div");
      wrapper.className = "script-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;

      const link = document.createElement("a");
      link.href   = repoUrl;
      link.target = "_blank";
      link.rel    = "noopener noreferrer";
      link.title  = "View on GitHub";

      const icon = document.createElement("img");
      icon.src       = "../public/logos/github.svg";
      icon.alt       = "GitHub";
      icon.className = "gh-icon";

      link.appendChild(icon);
      wrapper.appendChild(nameSpan);
      wrapper.appendChild(link);
      scriptListEl.appendChild(wrapper);
    });
  }

  // Loading state
  scriptListEl.innerHTML = `<div id="inactive-state"><p>Loading…</p></div>`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setInactive("No active tab.");
    return;
  }

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_LOADED_SCRIPTS" });

    if (chrome.runtime.lastError || !resp) {
      setInactive("Extension not active in this tab.");
      return;
    }

    if (!resp.scripts?.length) {
      setInactive("No active scripts on this page.");
      return;
    }

    setActive(resp.site, resp.scripts);

  } catch {
    setInactive("Extension not active in this tab.");
  }
});

// ─────────────────────────────────────────────────────────────
// View switching — footer buttons toggle between the scripts list,
// calculator, and settings views (only one visible at a time).
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const views = {
    scripts:    document.getElementById("scripts-list"),
    calculator: document.getElementById("calculator-view"),
    settings:   document.getElementById("settings-view"),
  };
  const toggles = {
    calculator: document.getElementById("calculator-toggle"),
    settings:   document.getElementById("settings-toggle"),
  };

  let activeView = "scripts";

  function showView(name) {
    activeView = activeView === name ? "scripts" : name;

    for (const [key, el] of Object.entries(views)) {
      el.classList.toggle("hidden-view", key !== activeView);
    }
    for (const [key, btn] of Object.entries(toggles)) {
      btn.classList.toggle("icon-btn--active", key === activeView);
    }
  }

  toggles.calculator.addEventListener("click", () => showView("calculator"));
  toggles.settings.addEventListener("click", () => showView("settings"));

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showView("scripts"));
  });
});

// ─────────────────────────────────────────────────────────────
// Settings — key price in ref, persisted to chrome.storage.local
// under the "settings" key.
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const keyPriceInput     = document.getElementById("settings-key-price");
  const earbudsKeysInput  = document.getElementById("settings-earbuds-keys");
  const earbudsRefInput   = document.getElementById("settings-earbuds-ref");
  const showDescInput     = document.getElementById("settings-show-item-descriptions");
  const saveBtn           = document.getElementById("settings-save");
  const savedMsg          = document.getElementById("settings-saved-msg");

  chrome.storage.local.get(["settings"], (result) => {
    const settings = result.settings ?? {};
    if (settings.keyPriceRef != null)      keyPriceInput.value    = settings.keyPriceRef;
    if (settings.earbudsPriceKeys != null) earbudsKeysInput.value = settings.earbudsPriceKeys;
    if (settings.earbudsPriceRef != null)  earbudsRefInput.value  = settings.earbudsPriceRef;
    // Shown by default unless the user's explicitly turned it off.
    showDescInput.checked = settings.showItemDescriptionsByDefault !== false;
  });

  function saveSettings() {
    const keyPriceRef      = parseFloat(keyPriceInput.value) || 0;
    const earbudsPriceKeys = parseFloat(earbudsKeysInput.value) || 0;
    const earbudsPriceRef  = parseFloat(earbudsRefInput.value) || 0;
    const showItemDescriptionsByDefault = showDescInput.checked;

    chrome.storage.local.set({ settings: { keyPriceRef, earbudsPriceKeys, earbudsPriceRef, showItemDescriptionsByDefault } }, () => {
      currentKeyPriceRef = keyPriceRef || null;
      onKeyPriceChanged();
      savedMsg.textContent = "Saved";
      setTimeout(() => { savedMsg.textContent = ""; }, 1500);
    });
  }

  saveBtn.addEventListener("click", saveSettings);
  [keyPriceInput, earbudsKeysInput, earbudsRefInput].forEach((el) => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") saveSettings(); });
  });
});

// ─────────────────────────────────────────────────────────────
// Calculator view — add up keys/metal from several items, either
// via per-denomination inputs or a compact "2 keys 5.33 ref" entry.
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  const entries = [];
  let mode = "compact"; // "detailed" | "compact"

  const els = {
    keysInput:    document.getElementById("calc-input-keys"),
    refInput:     document.getElementById("calc-input-ref"),
    recInput:     document.getElementById("calc-input-rec"),
    scrapInput:   document.getElementById("calc-input-scrap"),
    compactInput: document.getElementById("calc-input-compact"),
    addDetailedBtn: document.getElementById("calc-add-detailed"),
    addCompactBtn:  document.getElementById("calc-add-compact"),
    modeToggle:     document.getElementById("calc-mode-toggle"),
    detailedForm:   document.getElementById("calc-detailed-form"),
    compactForm:    document.getElementById("calc-compact-form"),
    entriesList:  document.getElementById("calc-entries-list"),
    emptyState:   document.getElementById("calc-empty-state"),
    totalDetailed:   document.getElementById("calc-total-detailed"),
    totalKeyed:      document.getElementById("calc-total-keyed"),
    totalKeyedHint:  document.getElementById("calc-total-keyed-hint"),
    clearBtn:     document.getElementById("calc-clear-all"),
  };

  // Splits a possibly-fractional key amount (e.g. 2.5) into a whole
  // key count plus the fractional part converted to ref, using the
  // settings key price. Fractional keys are meaningless without a
  // price to convert them, hence the error case.
  function splitFractionalKeys(rawKeys, keyPriceRef) {
    const keys = Math.floor(rawKeys);
    const frac = rawKeys - keys;

    if (frac === 0) return { keys, extraRef: 0, error: null };
    if (!keyPriceRef) {
      return { keys: 0, extraRef: 0, error: "Set a key price in Settings to use fractional keys." };
    }
    return { keys, extraRef: frac * keyPriceRef, error: null };
  }

  // Parses "2.5 keys", "2 keys, 55 refs", "5.33 ref", or "2 keys"
  // into a { keys, ref, rec, scrap } breakdown. Returns { amounts,
  // error }: amounts is null if the string couldn't be parsed at all,
  // error is set only when it parsed but fractional keys couldn't be
  // resolved (no key price set).
  function parseCompactInput(str, keyPriceRef) {
    const match = str.trim().match(/^(?:(\d+(?:\.\d+)?)\s*keys?,?\s*)?(?:(\d+(?:\.\d+)?)\s*refs?)?$/i);
    if (!match || (!match[1] && !match[2])) return { amounts: null, error: null };

    const rawKeys = match[1] ? parseFloat(match[1]) : 0;
    const { keys, extraRef, error } = splitFractionalKeys(rawKeys, keyPriceRef);
    if (error) return { amounts: null, error };

    const metal = (match[2] ? parseFloat(match[2]) : 0) + extraRef;

    const totalScrap = Math.round(metal * 9);
    const ref   = Math.floor(totalScrap / 9);
    const rem   = totalScrap % 9;
    const rec   = Math.floor(rem / 3);
    const scrap = rem % 3;

    return { amounts: { keys, ref, rec, scrap }, error: null };
  }

  function formatDetailed({ keys, ref, rec, scrap }) {
    const parts = [];
    if (keys)  parts.push(`${keys} ${TF2_CURRENCY.keys.short}`);
    if (ref)   parts.push(`${ref} ${TF2_CURRENCY.ref.short}`);
    if (rec)   parts.push(`${rec} ${TF2_CURRENCY.rec.short}`);
    if (scrap) parts.push(`${scrap} ${TF2_CURRENCY.scrap.short}`);
    return parts.length ? parts.join(" + ") : "Nothing";
  }

  // Plain sum — keys stay exactly as counted, metal just gets
  // re-normalized (e.g. 12 scrap entered directly reads as 1 ref + 1 rec).
  // No cross-conversion between keys and metal.
  function computeTotal() {
    const raw = entries.reduce((acc, e) => ({
      keys:  acc.keys  + (e.keys  || 0),
      ref:   acc.ref   + (e.ref   || 0),
      rec:   acc.rec   + (e.rec   || 0),
      scrap: acc.scrap + (e.scrap || 0),
    }), { keys: 0, ref: 0, rec: 0, scrap: 0 });

    const totalScrap = raw.ref * 9 + raw.rec * 3 + raw.scrap;
    return {
      keys:  raw.keys,
      ref:   Math.floor(totalScrap / 9),
      rec:   Math.floor((totalScrap % 9) / 3),
      scrap: totalScrap % 3,
    };
  }

  // Same total, but if the leftover metal is worth enough (at the
  // settings key price) to make another key, folds it in — e.g.
  // 2 keys + 65 ref at a 60 ref key price becomes 3 keys + 5 ref.
  // Returns null if there's no key price to convert with.
  function computeKeyedTotal(normalTotal, keyPriceRef) {
    if (!keyPriceRef) return null;

    const keyPriceScrap = Math.round(keyPriceRef * 9);
    if (keyPriceScrap <= 0) return null;

    const totalScrap = normalTotal.ref * 9 + normalTotal.rec * 3 + normalTotal.scrap;
    const extraKeys   = Math.floor(totalScrap / keyPriceScrap);
    if (!extraKeys) return normalTotal;

    const remainderScrap = totalScrap - extraKeys * keyPriceScrap;
    return {
      keys:  normalTotal.keys + extraKeys,
      ref:   Math.floor(remainderScrap / 9),
      rec:   Math.floor((remainderScrap % 9) / 3),
      scrap: remainderScrap % 3,
    };
  }

  function addEntry(amounts) {
    if (!amounts.keys && !amounts.ref && !amounts.rec && !amounts.scrap) return;
    entries.push(amounts);
    render();
  }

  function removeEntry(index) {
    entries.splice(index, 1);
    render();
  }

  function render() {
    els.entriesList.innerHTML = "";
    els.emptyState.style.display = entries.length ? "none" : "";

    entries.forEach((entry, i) => {
      const row = document.createElement("div");
      row.className = "calc-entry-row";

      const label = document.createElement("span");
      label.className = "calc-entry-label";
      label.textContent = formatDetailed(entry);
      row.appendChild(label);

      const removeBtn = document.createElement("button");
      removeBtn.className = "calc-entry-remove";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove";
      removeBtn.addEventListener("click", () => removeEntry(i));
      row.appendChild(removeBtn);

      els.entriesList.appendChild(row);
    });

    const total = computeTotal();
    els.totalDetailed.textContent = formatDetailed(total);

    const keyedTotal = computeKeyedTotal(total, currentKeyPriceRef);
    if (keyedTotal) {
      els.totalKeyed.textContent = formatDetailed(keyedTotal);
      els.totalKeyedHint.textContent = "";
    } else {
      els.totalKeyed.textContent = "—";
      els.totalKeyedHint.textContent = "Set a key price in Settings to see this.";
    }
  }

  onKeyPriceChanged = render;

  // ── Mode toggle ──
  els.modeToggle.addEventListener("click", () => {
    mode = mode === "detailed" ? "compact" : "detailed";
    els.modeToggle.textContent = mode === "detailed" ? "compact" : "detailed";
    els.detailedForm.classList.toggle("calc-entry-form--hidden", mode !== "detailed");
    els.compactForm.classList.toggle("calc-entry-form--hidden", mode !== "compact");
    (mode === "detailed" ? els.keysInput : els.compactInput).focus();
  });

  // ── Detailed add ──
  function addFromDetailed() {
    const rawKeys = parseFloat(els.keysInput.value) || 0;
    const { keys, extraRef, error } = splitFractionalKeys(rawKeys, currentKeyPriceRef);
    if (error) {
      window.alert(error);
      return;
    }

    const totalScrap = (parseInt(els.refInput.value)   || 0) * 9
                      + (parseInt(els.recInput.value)   || 0) * 3
                      + (parseInt(els.scrapInput.value) || 0)
                      + Math.round(extraRef * 9);

    addEntry({
      keys,
      ref:   Math.floor(totalScrap / 9),
      rec:   Math.floor((totalScrap % 9) / 3),
      scrap: totalScrap % 3,
    });
    els.keysInput.value = "0";
    [els.refInput, els.recInput, els.scrapInput].forEach((el) => { el.value = "0"; });
    els.keysInput.focus();
  }
  els.addDetailedBtn.addEventListener("click", addFromDetailed);
  [els.keysInput, els.refInput, els.recInput, els.scrapInput].forEach((el) => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") addFromDetailed(); });
  });

  // ── Compact add ──
  function addFromCompact() {
    const { amounts, error } = parseCompactInput(els.compactInput.value, currentKeyPriceRef);
    if (error) {
      window.alert(error);
      return;
    }
    if (!amounts) {
      els.compactInput.classList.add("calc-input-error");
      setTimeout(() => els.compactInput.classList.remove("calc-input-error"), 400);
      return;
    }
    addEntry(amounts);
    els.compactInput.value = "";
    els.compactInput.focus();
  }
  els.addCompactBtn.addEventListener("click", addFromCompact);
  els.compactInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addFromCompact(); });

  // ── Clear ──
  els.clearBtn.addEventListener("click", () => {
    entries.length = 0;
    render();
  });

  render();
});
