# Version 1.1.0 (v1.3.0)

- Added mannco.store, skinport.com, marketplace.tf, crate.tf (crates/cases only), next.bp.tf stats, and bp.tf/next.bp.tf History links (the last two keyed by the item's asset id, parsed out of the "Inspect in Game" link)
- Removed the old single "backpack.tf" link — replaced by the more clearly labeled "bp.tf stats"
- Quality/craftable/killstreak-tier/Australium/Festivized are now parsed off the item's full name and its "Tags:" line, instead of assuming every item is Unique quality and craftable — needed for marketplace.tf and next.bp.tf stats to resolve correctly for non-Unique items
- Added a "List on backpack.tf" button, styled as its own standalone CTA rather than another entry in the link row (skipped for Non-Tradable items) — its asset id, along with the History links', is now read primarily from the inventory grid's own tile id rather than the "Inspect in Game" link, which several items (Keys, Vintage Tribalman's Shiv) don't have at all

# Version 1.0.0

- Creates the buttons for steam market page and backpack.tf page
- For now, only simple items are supported