## Version 1.0.0 (v1.3.0)

* Added mannco.store and stntrading.eu links to the item hover popover on backpack.tf's classic UI, plus a scrap.tf keys link for Mann Co. Supply Crate Keys — Steam Market, marketplace.tf, Bp Stats and Wiki are already covered by backpack.tf's own popover links, so those aren't duplicated
* Quality/craftable are read from the popover's own Classifieds link when available, falling back to sane defaults (Unique, craftable) for items that don't have one (e.g. currency)
* Skips Non-Tradable items and Unusual items without a resolvable effect name, rather than link somewhere wrong
* Strips killstreak-tier and crate/case-number ("Series #N" or "#N") text from the name before building the mannco.store/stntrading.eu links, since neither site distinguishes items by those the way backpack.tf does
