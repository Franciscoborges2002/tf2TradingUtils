## Version 1.0.0 (v1.3.0)

* Added mannco.store and stntrading.eu links to the item hover popover on backpack.tf's classic UI, plus a scrap.tf keys link for Mann Co. Supply Crate Keys — Steam Market, marketplace.tf, Bp Stats and Wiki are already covered by backpack.tf's own popover links, so those aren't duplicated
* Quality/craftable are read from the popover's own Classifieds link when available, falling back to sane defaults (Unique, craftable) for items that don't have one (e.g. currency)
* Skips Non-Tradable items and Unusual items without a resolvable effect name, rather than link somewhere wrong
* Strips killstreak-tier text from the name before building the mannco.store/stntrading.eu links, since neither site distinguishes killstreak tier the way backpack.tf does. Crate/case-number ("Series #N" or "#N") text is stripped for mannco.store the same way, but kept for stntrading.eu — it has a separate page per series/case number
* Added a skinport.com link, using the same full display name mannco.store does
* Added a crate.tf link, crates/cases only
* Fixed mannco.store/skinport.com links for crate/case names that span multiple series under one shared display name (e.g. "Mann Co. Supply Crate", "Salvaged Mann Co. Supply Crate")
* Crate/case detection now uses the shared utils/tf2ItemSchema.js name check (covers Munition/Cooler/Reel too, not just Crate/Case, and excludes Keys)
* mannco.store/skinport.com no longer skip Unusual items; fixed the crate.tf link firing for any non-craftable item instead of just crates
* mannco.store/skinport.com now get craftability via the shared `craftable` option instead of relying on "Non-Craftable" text baked into the name
