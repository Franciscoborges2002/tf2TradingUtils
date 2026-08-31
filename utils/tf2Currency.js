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
