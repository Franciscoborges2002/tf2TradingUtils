## Version 1.0.0

* Added mannco.store and stntrading.eu links to the item hover tooltip on next.backpack.tf, plus a scrap.tf keys link for Mann Co. Supply Crate Keys — Stats, Classifieds, Inventory, Aggs, Item DB, Item, History and Wiki are already covered by next.backpack.tf's own tooltip links, so those aren't duplicated
* Quality is read from the tooltip's own Classifieds link (falling back to its Stats link) rather than guessed from the title text; craftable falls back to reading the title text itself, since neither link exposes it
* Skips Non-Tradable items and Unusual items without a resolvable effect name, rather than link somewhere wrong
* Strips killstreak-tier and crate/case-number ("Series #N" or "#N") text from the name before building the mannco.store/stntrading.eu links, since neither site distinguishes items by those the way backpack.tf does
