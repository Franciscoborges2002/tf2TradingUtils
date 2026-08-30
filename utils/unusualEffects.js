/**
 * Loads and caches the bundled Unusual effect id/name data
 * (utils/backpackUnusualsIds.json) — an object keyed by effect id,
 * e.g. { "32": { "name": "Orbiting Planets", "id": "32" }, ... }.
 *
 * Distinct from utils/UnusualIds.js (a different, separately-sourced
 * id<->name dataset used by unusualEffectBackground) — not consolidated
 * with it here; see project notes on the planned standalone Unusual
 * effects data repo before merging these two.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

let effectsDataPromise = null;

export async function getEffectsData() {
  if (!effectsDataPromise) {
    effectsDataPromise = fetch(
      chrome.runtime.getURL("utils/backpackUnusualsIds.json")
    ).then((res) => res.json());
  }
  return effectsDataPromise;
}
