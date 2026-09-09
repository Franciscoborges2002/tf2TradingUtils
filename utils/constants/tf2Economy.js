/**
 * TF2 economy constants shared across steamTradeOffer scripts — quality/
 * killstreak ids and app/context ids. Currency data (keys/ref/rec/scrap/
 * weapons) lives in utils/tf2Currency.js instead, alongside the math
 * for converting/formatting it — see that file's own header doc.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

export const TF2_APPID     = 440;
export const TF2_CONTEXTID = 2;

/**
 * TF2's quality id per quality name to id
 */
export const TF2_QUALITY_IDS = {
  "Normal": 0,
  "Genuine": 1,
  "Vintage": 3,
  "Unusual": 5,
  "Unique": 6,
  "Community": 7,
  "Valve": 8,
  "Self-Made": 9,
  "Customized": 10,
  "Strange": 11,
  "Completed": 12,
  "Haunted": 13,
  "Collector's": 14,
  "Decorated Weapon": 15,
};

/** Same names as TF2_QUALITY_IDS, as a plain array */
export const TF2_QUALITY_NAMES = Object.keys(TF2_QUALITY_IDS);

/** TF2's two craftability states, as shown in item names/URLs across every site here. */
export const TF2_CRAFTABILITY = ["Craftable", "Non-Craftable"];

/**
 * Killstreak sheen name to id
 */
export const TF2_KS_SHEEN_IDS = {
  "Team Shine": 1,
  "Deadly Daffodil": 2,
  "Manndarin": 3,
  "Mean Green": 4,
  "Agonizing Emerald": 5,
  "Villainous Violet": 6,
  "Hot Rod": 7,
};

/**
 * Killstreaker effect name to id
 */
export const TF2_KS_KILLSTREAKER_IDS = {
  "Fire Horns": 2002,
  "Cerebral Discharge": 2003,
  "Tornado": 2004,
  "Flames": 2005,
  "Singularity": 2006,
  "Incinerator": 2007,
  "Hypno-Beam": 2008,
};
