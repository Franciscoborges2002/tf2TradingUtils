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
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEAaR4uURrwvz0N252yVaDVWrRTno9m4ccG2GNqxlQoZrC2aG9hcVGUWflbX_drrVu5UGki5sAij6tOtQ",
  },
  ref: {
    name:       "Refined Metal",
    short:      "Ref",
    scrapValue: 9,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsO1Mv6NGucF1Ygzt8ZQijJukFMiMrbhYDEwI1yRVKNfD6xorQ3qW3Jr6546DNPuou9IOVK4p4kWJaA",
  },
  rec: {
    name:       "Reclaimed Metal",
    short:      "Rec",
    scrapValue: 3,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsO0Mv6NGucF1YJlscMEgDdvxVYsMLPkMmFjI1OSUvMHDPBp9lu0CnVluZQxA9Gwp-hIOVK4sMMNWF4",
  },
  scrap: {
    name:       "Scrap Metal",
    short:      "Scrap",
    scrapValue: 1,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsPZAfOeD-VOn4phtsdQ32ZtxFYoN7PkYmVmIgeaUKNaX_Rjpwy8UHMz6pcxAIfnovUWJ1t9nYFqYw",
  },
};

/** Same data as TF2_CURRENCY, indexed by full Steam item name instead. */
export const TF2_CURRENCY_BY_NAME = Object.fromEntries(
  Object.values(TF2_CURRENCY).map((c) => [c.name, c])
);
