# Version 1.0.0

- Added the "🔧 Trade Panel" panel, positioned directly above the trade summary panel: add keys/metal (detailed or compact "5 keys 5.44 ref" input), add any named item (live autocomplete search + quantity), or add every item currently visible in the inventory grid — all from either your own or the trade partner's inventory, following the currently selected Steam inventory tab
- Items are added by writing directly to Steam's own `g_rgCurrentTradeStatus` trade state and calling `RefreshTradeStatus`
- 🗑 button clears every item from the active side of the trade, with a confirmation prompt
- The "Add Visible Page" button is **not verified against a live trade offer page** — it uses `offsetParent === null` as a generic "not currently rendered" test rather than a confirmed pagination selector
- Fixed 🗑 clear-side leaving some inventory tiles empty instead of showing the item as available again — clearing wiped the whole trade side in one bulk mutation plus a single `RefreshTradeStatus()` call, which didn't give Steam's own per-item "return this tile to the inventory grid" logic enough refresh cycles to run for every item; now removes and refreshes one item at a time
