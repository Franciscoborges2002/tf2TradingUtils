# Version 1.1.1 (v1.3.0)

- Added a skinport.com link
- Added a crate.tf link, crates/cases only
- Renamed ItemLinks to itemLinks
- Added mannco.store and marketplace.tf links
- Removed Bp Classifieds and Next Bp Classifieds links, keeping only Bp Stats and Next Bp Stats
- Added Festivized detection
- Fixed Steam Market and mannco.store links missing the quality word for some items (e.g. Strange, Genuine) and the killstreak tier prefix (e.g. Specialized Killstreak) — both were being stripped for the backpack.tf links but never added back for these
- Fixed marketplace.tf sometimes linking to the wrong (untradeable stock) defindex instead of the real tradable one, for weapons that have both
- Fixed Steam Market link for reward/unlock crates (e.g. "Non-Craftable Unlocked Cosmetic Crate Multi-Class") — their Market listing name drops "Non-Craftable" entirely, unlike every other Non-Craftable item
- Fixed the merchant.tf link dropping craftability entirely — a Non-Craftable item now correctly links to its "non-craftable-" prefixed search
- Added a gladiator.tf sales-page link
- "Bp Stats" and "Next Bp Stats" are now a single "Bp Stats" button that follows the popup's new "Default bp.tf version" setting
- Brought back a "Bp Classifieds" link (removed in this same version, above) — now also filters by killstreak sheen/killstreaker when the item has one, for a more specific comparison

# Version 1.1.0

- Added a mousewheel or control click modal update
- Changed script name from scrapHoverItemLinks to ItemLinks

# Version 1.0.0

- Modal Created
- Support for all qualities, craftable/non-craftable, australium, killstreaks, Strange Parts
- Links for bp.tf stats and classifieds, and wiki page