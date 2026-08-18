## Version 1.0.2

Fixed the merchant.tf link never accounting for craftability at all — a Non-Craftable item now correctly links to its "non-craftable-" prefixed search
Added a gladiator.tf sales-page link
Fixed a crash on load — imported CRATE_NUMBER_RE from utils/itemLinks.js, which never actually exported it; now centralized there and imported by every site that needs it, instead of each keeping its own copy

## Version 1.0.1

Renamed from scrapItemsLinks to scrapItemsTableLinks

## Version 1.0.0

Added stntrading.eu links
Added backpack.tf links
Changed the previous code to be in the style of the most recent i made
Changed name from scrapItemList to scrapItemLinks