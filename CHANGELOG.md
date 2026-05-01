# 📝 Changelog - TF2TradingUtils

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-04-29
 
### Added
- showTradeDDetails script
- addCurrency script
- pageContext script
- filterSpecialItems script for backpack.tf

### Updated
- New popup UI redesign
  - Active/inactive status badge — blue (`#395C78`) when scripts are loaded, red (`#9D312F`) when extension is not active on the page
  - Script rows now show the script name and a GitHub icon link side by side
  - Host label displayed under the extension title in the header

### Fixed
- Fixed `Uncaught SyntaxError: Identifier 'EXT_SCRIPT_INFO' has already been declared` error caused by both `steamcommunity.com/content.js` and `steamTradeOffer/content.js` being injected on `steamcommunity.com/profiles/*` pages simultaneously
  - Removed `https://steamcommunity.com/profiles/*` from `steamTradeOffer` content script matches in `manifest.json` — trade offer scripts should only run on trade offer pages

## [1.1.1] - 2026-02-14
I lost the changnes I was doing, when I was transitioning OS :(
### Added
- Added botRep script on steamcommunity.com and tradeoffers scripts folders
- Added itemLinks script on steamcommunity.com scripts folder
- Published extension on firefox

### Updated
- Added steamdb.info in steamLinks script
- Better handling itemLinks in scrap.tf

## [1.1.0] - 2025-11-24
### Added
- Script scrapHoverItemLinks for scrap.tf website
- Script partnerLinks for steam trade helper
- Script links2Backpack (stntrading.eu) now supports unusal linking to backpack.tf websites
- Popup to the extension to showcase the current scripts that were loaded

### Updated
- Minor changes
  - Added script in stntrading.eu README.md, links2Backpack
  - Changed script name scrapItemsLinks -> scrapItemsTableLinks
  - Changed script folder steamTradeHelper -> steamTradeOffer
  - Updated steamTradeOffer with the script
  - Added filter to don't load the scripts for subdomains in scrap.tf and backpack.tf
- content.js (scrap.tf script router) updated to have the new script
- Added screenshots of the scripts in /public/promotional

---

## [1.0.1] - 2025-09-24
### Added
- Script Router for all scritps
- Added addKSButtons in backpack.tf old UI
- Added Stntrading.eu items page to backpack.tf

### Updated
- steamLinks
  - Added posts.tf link

---

## [1.0.0] - 2025-09-10
### Added
- Initial release of TF2TradingUtils in chrome web store.
- Support for Scrap.tf and stntrading.eu (basic integration).
- Support for steam profile scripts:
  - Easily navigate through the TF2 trading profiles of an user.
