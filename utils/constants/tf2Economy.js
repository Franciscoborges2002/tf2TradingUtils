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
 *
 * classid: this item's Steam economy classid (the "classinfo/440/<classid>/
 * <instanceid>" pages like steamcommunity.com/profiles/*\/tradeoffers/
 * key items by, with no name/description text of their own to read) —
 * NOT the same as defindex (app_data.def_index in the same classinfo),
 * a separate TF2-schema id; confirmed distinct for every entry below.
 * Confirmed against real classinfo data: Scrap by an exact iconHash
 * match, Refined/Reclaimed by their icon image (the steamcdn class-image
 * endpoint they used doesn't expose iconHash, so those were a visual
 * check instead), Keys from a page's own embedded classinfo JSON
 * (BuildHover(...) call) giving classid/instanceid directly by name.
 */
export const TF2_CURRENCY = {
  keys: {
    name:       "Mann Co. Supply Crate Key",
    short:      "Keys",
    scrapValue: null,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEAaR4uURrwvz0N252yVaDVWrRTno9m4ccG2GNqxlQoZrC2aG9hcVGUWflbX_drrVu5UGki5sAij6tOtQ",
    classid:    "101785959",
    instanceid: "11040578",
  },
  ref: {
    name:       "Refined Metal",
    short:      "Ref",
    scrapValue: 9,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsO1Mv6NGucF1Ygzt8ZQijJukFMiMrbhYDEwI1yRVKNfD6xorQ3qW3Jr6546DNPuou9IOVK4p4kWJaA",
    classid:    "2674",
    instanceid: "11040547",
  },
  rec: {
    name:       "Reclaimed Metal",
    short:      "Rec",
    scrapValue: 3,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsO0Mv6NGucF1YJlscMEgDdvxVYsMLPkMmFjI1OSUvMHDPBp9lu0CnVluZQxA9Gwp-hIOVK4sMMNWF4",
    classid:    "5564",
    instanceid: "11040547",
  },
  scrap: {
    name:       "Scrap Metal",
    short:      "Scrap",
    scrapValue: 1,
    iconHash:   "fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEbZQsUYhTkhzJWhsPZAfOeD-VOn4phtsdQ32ZtxFYoN7PkYmVmIgeaUKNaX_Rjpwy8UHMz6pcxAIfnovUWJ1t9nYFqYw",
    classid:    "2675",
    instanceid: "11040547",
  },
};

/** Same data as TF2_CURRENCY, indexed by full Steam item name instead. */
export const TF2_CURRENCY_BY_NAME = Object.fromEntries(
  Object.values(TF2_CURRENCY).map((c) => [c.name, c])
);

/** Same data as TF2_CURRENCY, indexed by Steam economy classid — only the entries with a confirmed classid (see TF2_CURRENCY's own doc comment). */
export const TF2_CURRENCY_BY_CLASSID = Object.fromEntries(
  Object.values(TF2_CURRENCY).filter((c) => c.classid).map((c) => [c.classid, c])
);

/**
 * TF2's quality id per quality name, as used in the game's own item
 * schema (and the "sku" format — defindex;quality — shared by
 * backpack.tf, prices.tf, TF2Autobot and marketplace.tf).
 */
export const TF2_QUALITY_IDS = {
  Normal: 0,
  Genuine: 1,
  Vintage: 3,
  Unusual: 5,
  Unique: 6,
  Community: 7,
  Valve: 8,
  "Self-Made": 9,
  Customized: 10,
  Strange: 11,
  Completed: 12,
  Haunted: 13,
  "Collector's": 14,
  "Decorated Weapon": 15,
};
