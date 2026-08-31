# Version 1.1.0 (v1.3.0)

- Renamed from link2Backpack to itemLinks, reflecting its broader scope
- Added mannco.store, skinport.com, marketplace.tf, crate.tf (crates/cases only), backpack.tf classifieds (classic + next), Steam Market, and Wiki links, alongside the existing backpack.tf stats links
- Fixed mannco.store/skinport.com links for crate/case names that span multiple series under one shared display name (e.g. "Mann Co. Supply Crate", "Salvaged Mann Co. Supply Crate")
- Fixed: crates (e.g. "Mann Co. Supply Crate Series #34") linked to a broken bp.tf stats URL — the " Series #N" suffix isn't part of the schema name, so it's now stripped and re-attached as the trailing series-number path segment instead
- Fixed: an unknown/mistyped item page has no `<h1>` at all
- Fixed: marketplace.tf and mannco.store links for crates included the raw "Series #N"/"#N" suffix, breaking the schema lookup — marketplace.tf now gets it as a `c<N>` sku modifier, mannco.store drops it (matches how it already worked for bp.tf stats)
- Fixed: bp.tf stats and marketplace.tf links for Festive weapons (e.g. "Festive Eyelander") dropped the "Festive " and linked to the plain weapon instead
- Fixed: bp.tf stats for "Festive Force-A-Nature" used the wrong casing ("Festive Force-A-Nature" instead of "Festive Force-a-Nature")
- Fixed: Genuine and Collector's quality weren't recognized at all
- Fixed the merchant.tf link dropping craftability entirely (e.g. "Non-Craftable Duck Journal" linked to the craftable search instead of "non-craftable-duck-journal")
- Added a gladiator.tf sales-page link
- "bp.tf stats" and "next.bp.tf stats" are now a single "bp.tf stats" button that follows the popup's new "Default bp.tf version" setting
- Internal: utils/itemLinks.js builders now take (name, quality, options) instead of one combined object; crate/defindex data moved to utils/tf2ItemSchema.js

# Version 1.0.1

- Now this script supports unusuals linking.

# Version 1.0.0

- Creates a button with linking to redirect to backpack page