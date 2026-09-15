/**
 * Bundled Unusual effect id/name data, in the { id: { name, id } } shape
 * findUnusualEffect() (stntrading.eu/itemLinks) and getUnusualEffectId()
 * (scrap.tf/itemLinks) expect — built once from utils/UnusualIds.js's
 * `UnusualIds` (name -> id) export, the extension's one real bundled
 * Unusual effect dataset (sourced from
 * https://github.com/Franciscoborges2002/tf2-unusual-ids, also used by
 * steamcommunity.com/unusualEffectBackground).
 *
 * This used to fetch utils/backpackUnusualsIds.json instead — that file
 * was never actually added to the repo, so every caller silently failed
 * (a 404'd fetch) until this pointed at UnusualIds.js instead.
 *
 * Kept as its own small async-shaped wrapper (getEffectsData() still
 * returns a Promise, even though the underlying transform is now
 * synchronous) so callers already written against it don't need to
 * change.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

import { UnusualIds } from "./UnusualIds.js";

let effectsData = null;

export async function getEffectsData() {
  if (!effectsData) {
    effectsData = Object.fromEntries(
      Object.entries(UnusualIds).map(([name, id]) => [id, { name, id: String(id) }])
    );
  }
  return effectsData;
}

/**
 * Reverse-looks-up an Unusual effect's numeric id from its exact name —
 * shared by any page that already has the precise effect name from its
 * own DOM (scrap.tf's tooltip "Effect: X" line, steamcommunity.com's
 * description panel "★ Unusual Effect: X" line) and just needs the
 * matching id, as opposed to stntrading.eu's own findUnusualEffect(),
 * which has to guess the effect by scanning a whole display name for a
 * substring match.
 * @param {string} effectName
 * @returns {Promise<string|null>}
 */
export async function getUnusualEffectId(effectName) {
  const effectData = await getEffectsData();
  const match = Object.values(effectData).find((e) => e.name.toLowerCase() === effectName.toLowerCase());
  return match?.id ?? null;
}
