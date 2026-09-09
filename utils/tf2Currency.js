/**
 * TF2 metal currency math — scrap is the base integer unit (1 refined =
 * 9 scrap, 1 reclaimed = 3 scrap), and every conversion here works in
 * that integer space rather than float ref math, since dividing/
 * rounding a decimal ref value directly silently produces the wrong
 * TF2-convention result.
 *
 * Bug this replaces, found duplicated (and already-buggy) across
 * steamcommunity.com/tradeOfferCurrency and steamcommunity.com/
 * inventoryCurrencyCounter: `Math.round((remainder / 9) * 100)` for the
 * decimal digits rounds UP for remainder 5-8 — e.g. 2 reclaimed (scrap
 * remainder 6) became "67" instead of "66" — since remainder/9*100 is
 * really remainder*11.111..., and that .11 excess crosses the rounding
 * threshold once remainder >= 5. TF2's own display convention is each
 * scrap worth exactly ".11" of a refined (not the true 1/9 ≈ .1111),
 * with a full 9 scrap (3 reclaimed) rolling over to the next whole
 * refined — "1.00", never ".99". Multiplying the remainder by 11
 * directly (integer math, no division at all) reproduces that exactly.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js, or popup.js) — see
 * utils/constants/README.md.
 */

import { TF2_CURRENCY } from "./constants/tf2Economy.js";
import { WEAPONS } from "./constants/weapons.js";

/**
 * Converts {ref, rec, scrap} denomination counts into one total scrap
 * integer. Keys aren't included — they have no fixed scrap value (see
 * TF2_CURRENCY.keys.scrapValue), priced separately by whoever calls this.
 * @param {{ref?: number, rec?: number, scrap?: number}} [counts]
 * @returns {number}
 */
export function toScrap({ ref = 0, rec = 0, scrap = 0 } = {}) {
  return ref * TF2_CURRENCY.ref.scrapValue + rec * TF2_CURRENCY.rec.scrapValue + scrap * TF2_CURRENCY.scrap.scrapValue;
}

/**
 * Converts a total scrap integer back into exact {ref, rec, scrap}
 * denomination counts — no fractional scrap, no decimal rounding at all.
 * @param {number} totalScrap
 * @returns {{ref: number, rec: number, scrap: number}}
 */
export function fromScrap(totalScrap) {
  const ref = Math.floor(totalScrap / 9);
  const remainder = totalScrap - ref * 9;
  const rec = Math.floor(remainder / 3);
  const scrap = remainder % 3;
  return { ref, rec, scrap };
}

/**
 * Formats a total scrap integer as TF2's own decimal-refined display —
 * see this file's own header doc for why this isn't just
 * `(totalScrap / 9).toFixed(2)`.
 * @param {number} totalScrap
 * @returns {string} e.g. "1.66"
 */
export function formatRefined(totalScrap) {
  const ref = Math.floor(totalScrap / 9);
  const remainder = totalScrap - ref * 9;
  const decimal = String(remainder * 11).padStart(2, "0");
  return `${ref}.${decimal}`;
}

/**
 * Parses a decimal-refined number (e.g. 1.66, or the text "1.66") into
 * a total scrap integer — the inverse of formatRefined(). Input that
 * doesn't land exactly on the TF2 currency grid (e.g. a mistyped
 * "1.67") snaps to the nearest real scrap value.
 * @param {number|string} refinedValue
 * @returns {number}
 */
export function parseRefined(refinedValue) {
  const value = Number(refinedValue);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * TF2_CURRENCY.ref.scrapValue);
}

/**
 * Multiplies a per-unit decimal-refined price by a quantity, staying in
 * integer scrap space throughout — e.g. for a "quantity × price/unit"
 * bulk total — so the result lands exactly on the TF2 currency grid
 * instead of drifting from repeated float multiplication on the
 * decimal price itself.
 * @param {number|string} pricePerUnitRefined
 * @param {number} quantity
 * @returns {number} total scrap
 */
export function multiplyRefined(pricePerUnitRefined, quantity) {
  const qty = Math.max(0, Math.trunc(Number(quantity) || 0));
  return parseRefined(pricePerUnitRefined) * qty;
}

/**
 * Weapons (craft-fodder items used as sub-scrap currency) are worth
 * exactly half a scrap — 2 weapons = 1 scrap — so they can't be
 * represented as a `scrapValue` the way keys/ref/rec/scrap are (that'd
 * make scrap itself no longer the smallest integer unit everything
 * above is built on). The four functions below instead work in
 * "half-scrap" units (1 ref = 18, 1 rec = 6, 1 scrap = 2, 1 weapon = 1),
 * built on top of toScrap()/fromScrap() above rather than duplicating
 * their math — every existing caller that doesn't care about weapons
 * keeps using the plain scrap-based functions untouched.
 */

/**
 * Converts {ref, rec, scrap, weapons} denomination counts into one
 * total half-scrap integer.
 * @param {{ref?: number, rec?: number, scrap?: number, weapons?: number}} [counts]
 * @returns {number}
 */
export function toHalfScrap({ ref = 0, rec = 0, scrap = 0, weapons = 0 } = {}) {
  return toScrap({ ref, rec, scrap }) * 2 + weapons;
}

/**
 * Converts a total half-scrap integer back into exact {ref, rec, scrap,
 * weapons} denomination counts — `weapons` is always 0 or 1, any full
 * pair already having been folded into an extra scrap.
 * @param {number} totalHalfScrap
 * @returns {{ref: number, rec: number, scrap: number, weapons: number}}
 */
export function fromHalfScrap(totalHalfScrap) {
  const weapons = totalHalfScrap % 2;
  return { ...fromScrap(Math.floor(totalHalfScrap / 2)), weapons };
}

/**
 * Formats a total half-scrap integer as TF2's own decimal-refined
 * display, weapons included — each weapon is worth exactly ".05" (half
 * of a scrap's ".11", rounded down, matching the community convention),
 * so e.g. 1 scrap + 1 weapon is "0.16", not "0.165".
 * @param {number} totalHalfScrap
 * @returns {string} e.g. "0.16"
 */
export function formatRefinedWithWeapons(totalHalfScrap) {
  const ref = Math.floor(totalHalfScrap / 18);
  const remainder = totalHalfScrap - ref * 18;
  const scrap = Math.floor(remainder / 2);
  const weapons = remainder % 2;
  const decimal = String(scrap * 11 + weapons * 5).padStart(2, "0");
  return `${ref}.${decimal}`;
}

// Not every weapon actually trades at exactly 0.5 scrap (promotional/
// rare ones are worth far more) — WEAPONS has no way to tell those
// apart from an ordinary one by name alone, so treating every match as
// worth 0.5 scrap is a deliberate "good enough for now" approximation,
// not a guarantee.
const WEAPON_CURRENCY_NAMES = new Set(WEAPONS);

/**
 * Whether a raw item name is a plain weapon tradable as 0.5-scrap
 * "currency fodder" (2 weapons = 1 scrap — see toHalfScrap()'s own doc,
 * and this file's own note above on the accuracy of this check). Only
 * matches an EXACT name — no quality or Non-Craftable prefix at all —
 * since a "Vintage"/"Strange"/etc. weapon, or a Non-Craftable one,
 * isn't worth 0.5 scrap either. A leading "The " IS stripped first
 * though: unlike quality/craftability, that's not a value signal — a
 * handful of TF2's earliest weapons (e.g. "The Kritzkrieg") genuinely
 * carry it as part of their real Steam name, while WEAPONS itself only
 * ever stores the bare form, so this normalizes rather than requiring
 * that list to get every individual item's "The" exactly right.
 * @param {string} name
 * @returns {boolean}
 */
export function isWeaponCurrency(name) {
  const normalized = String(name || "").trim().replace(/^The\s+/, "");
  return WEAPON_CURRENCY_NAMES.has(normalized);
}
