# Version 1.0.0

- Added the panel to add keys and metal to a trade — detailed (per-denomination) and compact ("5 keys 5.44 ref") modes
- Added support for adding currency from either your own inventory or the trade partner's inventory, following the currently selected Steam inventory tab
- Fixed items not actually being added to the trade — items are now added by writing directly to Steam's own `g_rgCurrentTradeStatus` trade state and calling `RefreshTradeStatus`, instead of simulating clicks on inventory items (which only selects them)
- Renamed from `addCurrency` to `tradeOfferPanel` to make room for future trade offer utilities beyond currency
- Added a 🗑 button to clear every item from the currently active side of the trade (yours/theirs), with a confirmation prompt before removing anything
- Moved the panel to sit directly above the trade summary panel (showTradeDetails), instead of above the inventory controls
- Fixed the panel header only spanning half the panel width — it was wrapping next to a floated Steam element; added `clear: both` and `width: 100%` to the panel
