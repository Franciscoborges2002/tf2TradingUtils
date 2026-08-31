/**
 * User-facing message text for the extension's injected UI — centralized
 * so wording can be changed in one place instead of hunting through each
 * content script.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

export const TF2_TRADING_UTILS_PREFIX = "[TF2TradingUtils]";

/**
 * steamcommunity.com/itemLinks: shown in place of the reference-links
 * row when an item has a name tag and no Market listing to recover its
 * real name/attributes from (see getMarketListingName()'s own doc).
 */
export const STEAMCOMMUNITY_CANT_GENERATE_ITEMLINKS =
  `${TF2_TRADING_UTILS_PREFIX} Could not identify this item's real name/attributes ` +
  "(it's been renamed, and there's no Market listing to recover them from) " +
  "— reference links skipped.";
