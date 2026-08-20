## Version 1.0.0

* Added mannco.store and stntrading.eu links to the item hover tooltip on next.backpack.tf, plus a scrap.tf keys link for Mann Co. Supply Crate Keys — Stats, Classifieds, Inventory, Aggs, Item DB, Item, History and Wiki are already covered by next.backpack.tf's own tooltip links, so those aren't duplicated
* Quality is read from the tooltip's own Classifieds link (falling back to its Stats link) rather than guessed from the title text; craftable falls back to reading the title text itself, since neither link exposes it
* Skips Non-Tradable items and Unusual items without a resolvable effect name, rather than link somewhere wrong
* Strips killstreak-tier text from the name before building the mannco.store/stntrading.eu links, since neither site distinguishes killstreak tier the way backpack.tf does. Crate/case-number ("Series #N" or "#N") text is stripped for mannco.store the same way, but kept for stntrading.eu — it has a separate page per series/case number
* Added a skinport.com link, using the same full display name mannco.store does
* Added a crate.tf link, crates/cases only
* Fixed mannco.store/skinport.com links for crate/case names that span multiple series under one shared display name (e.g. "Mann Co. Supply Crate", "Salvaged Mann Co. Supply Crate")
* Internal: utils/itemLinks.js builders now take (name, quality, options) instead of one combined object; crate/defindex data moved to utils/tf2ItemSchema.js
* Crate/case detection now uses the shared utils/tf2ItemSchema.js name check (covers Munition/Cooler/Reel too, not just Crate/Case, and excludes Keys)
* mannco.store/skinport.com no longer skip Unusual items; fixed the crate.tf link firing for any non-craftable item instead of just crates
