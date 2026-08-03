/**
 * TF2 economy constants shared across steamTradeOffer scripts.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

export const TF2_APPID     = 440;
export const TF2_CONTEXTID = 2;

/**
 * Currency metadata keyed by the short key used throughout the trade
 * scripts ({ keys, ref, rec, scrap } amount objects).
 * scrapValue: how many scrap this denomination is worth, used for the
 * ref/rec/scrap breakdown math (9 scrap = 1 ref, 3 scrap = 1 rec).
 * Keys have no scrap value — priced separately, usually in ref.
 * In future, add a setting so user can update it to its own value.
 */
export const TF2_CURRENCY = {
  keys: {
    name:       "Mann Co. Supply Crate Key",
    short:      "Keys",
    scrapValue: null,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEMfvFAz-K1wRIaGRXY_GrPIGIFyBfPAhBtm4V0JYGb18_LbFgXMvb_fFjSJN-S4HmhFuJcLR-Y1M2Z4MCA",
  },
  ref:   { name: "Refined Metal",   short: "Ref",   scrapValue: 9 },
  rec:   { name: "Reclaimed Metal", short: "Rec",   scrapValue: 3 },
  scrap: { name: "Scrap Metal",     short: "Scrap", scrapValue: 1 },
};

/** Same data as TF2_CURRENCY, indexed by full Steam item name instead. */
export const TF2_CURRENCY_BY_NAME = Object.fromEntries(
  Object.values(TF2_CURRENCY).map((c) => [c.name, c])
);
