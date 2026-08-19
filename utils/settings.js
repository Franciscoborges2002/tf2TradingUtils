/**
 * Canonical shape + read/validate/update helpers for the extension's
 * popup Settings (chrome.storage.local's "settings" key). Centralizes
 * what used to be duplicated per-consumer — itemDescriptionToggle,
 * unusualEffectBackground and inventoryCurrencyCounter each read
 * chrome.storage.local directly and applied their own ad-hoc
 * default/clamp logic, and popup.js's own save handler re-implemented
 * the same clamping a second time, independently. Only usable from
 * files loaded as ES modules — see utils/constants/README.md.
 */

export const DEFAULT_SETTINGS = {
  keyPriceRef: 0,
  earbudsPriceKeys: 0,
  earbudsPriceRef: 0,
  showItemDescriptionsByDefault: true,
  unusualEffectScale: 1.3,
  bpTfVersion: "classic",
};

const BP_TF_VERSIONS = ["classic", "next"];

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Normalizes a raw settings object — possibly partial (a field never
 * saved yet), possibly malformed (hand-edited storage, or saved by an
 * older version of the extension before a field existed) — into one
 * with every field present and valid, falling back to
 * DEFAULT_SETTINGS field-by-field rather than all-or-nothing (so one
 * bad field doesn't wipe out the rest of an otherwise-good object).
 */
export function validateSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    keyPriceRef: positiveNumber(source.keyPriceRef, DEFAULT_SETTINGS.keyPriceRef),
    earbudsPriceKeys: positiveNumber(source.earbudsPriceKeys, DEFAULT_SETTINGS.earbudsPriceKeys),
    earbudsPriceRef: positiveNumber(source.earbudsPriceRef, DEFAULT_SETTINGS.earbudsPriceRef),
    // Shown by default unless the user's explicitly turned it off.
    showItemDescriptionsByDefault: source.showItemDescriptionsByDefault !== false,
    unusualEffectScale: Math.min(1.8, Math.max(1,
      positiveNumber(source.unusualEffectScale, DEFAULT_SETTINGS.unusualEffectScale))),
    bpTfVersion: BP_TF_VERSIONS.includes(source.bpTfVersion) ? source.bpTfVersion : DEFAULT_SETTINGS.bpTfVersion,
  };
}

// Cached after the first read per page load — every consumer wants the
// same settings, no need to hit chrome.storage.local again for each
// one. updateSettings() below refreshes this cache itself (rather than
// just clearing it) so a save made from the same context is reflected
// immediately, without waiting on a fresh round-trip.
let settingsPromise = null;

/** The current settings, normalized/defaulted via validateSettings() — never the raw, possibly-partial stored object. */
export function getSettings() {
  if (!settingsPromise) {
    settingsPromise = new Promise((resolve) => {
      chrome.storage.local.get(["settings"], (result) => resolve(validateSettings(result.settings)));
    });
  }
  return settingsPromise;
}

/**
 * Merges `partial` into the current settings, validates the combined
 * result, and persists it. Resolves with the full, normalized settings
 * object that was actually saved (not just `partial`) — the popup's
 * own Settings form uses this to reflect back any clamping (e.g. an
 * out-of-range effect scale) rather than showing whatever the user
 * literally typed.
 *
 * @param {Partial<typeof DEFAULT_SETTINGS>} partial
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function updateSettings(partial) {
  const current = await getSettings();
  const next = validateSettings({ ...current, ...partial });

  await new Promise((resolve) => chrome.storage.local.set({ settings: next }, resolve));
  settingsPromise = Promise.resolve(next);
  return next;
}
