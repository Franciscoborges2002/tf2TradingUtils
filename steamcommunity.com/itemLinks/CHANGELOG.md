# Version 1.1.0 (v1.3.0)

- "bp.tf stats"/"next.bp.tf stats" and "bp.tf history"/"next.bp.tf history" are now single buttons each, following the popup's new "Default bp.tf version" setting
- Added mannco.store, skinport.com, marketplace.tf, crate.tf (crates/cases only), next.bp.tf stats, and bp.tf/next.bp.tf History links (the last two keyed by the item's asset id, parsed out of the "Inspect in Game" link)
- Removed the old single "backpack.tf" link — replaced by the more clearly labeled "bp.tf stats"
- Quality/craftable/killstreak-tier/Australium/Festivized are now parsed off the item's full name and its "Tags:" line, instead of assuming every item is Unique quality and craftable — needed for marketplace.tf and next.bp.tf stats to resolve correctly for non-Unique items
- Added a "List on backpack.tf" button, styled as its own standalone CTA rather than another entry in the link row (skipped for Non-Tradable items and for someone else's inventory) — its asset id, along with the History links', is now read primarily from the inventory grid's own tile id rather than the "Inspect in Game" link, which several items don't have at all
- Fixed all links showing up for other games' items too (CS2, etc.) on the shared multi-game inventory page — even on first load, before Steam's own URL hash reflects which game tab is actually active
- Internal: utils/itemLinks.js builders now take (name, quality, options) instead of one combined object; crate/defindex data moved to utils/tf2ItemSchema.js
- Fixed crate/case series number ("#N") leaking raw into mannco.store/skinport.com links instead of being stripped, and stntrading.eu never re-attaching it for ambiguous multi-series names

# Version 1.0.0

- Creates the buttons for steam market page and backpack.tf page
- For now, only simple items are supported