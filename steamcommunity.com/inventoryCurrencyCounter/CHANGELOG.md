# Version 1.0.0 (v1.3.0)

- Added a live currency counter to the Steam inventory page, shown while viewing the TF2 tab — since backpack.tf's own inventory cache can lag behind or fail to refresh
- Reads straight from Steam's own inventory endpoint (matched by `market_hash_name`), rather than scraping the rendered item grid or matching item icon hashes — handles pagination for large inventories automatically, sized off the page's own page-count control
- Shows keys, Earbuds, total metal, and a ref/rec/scrap breakdown with each denomination's icon
- Shows a total inventory value in ref once a key price and an Earbuds price are set in the popup's Settings view, with the ref/key icons next to each figure — otherwise shows a hint that pricing is missing
- Fixed the owner's steamid64 not resolving on custom vanity inventory URLs (`/id/<vanity>/inventory/`) — now also falls back to `#filter_options`' own per-app tag container ids, which embed it regardless of URL shape
- Now shows an estimate from `inventoryFetchBridge`'s already-observed data instead of making its own request — updates itself for free as the bridge sees more of the inventory (e.g. while scrolling), with a hint when it's still partial
- Makes an actual request only when ↻ Refresh is clicked, sized off the inventory's real `total_inventory_count` and capped at 2000  — a couple of big requests instead of looping through it 75 at a time. A failed fetch keeps the estimate up with a hint to try again
- Title now shows how many items have loaded so far (e.g. "2412/2539 items loaded")
- Now reads pricing settings via the shared `utils/settings.js` instead of its own local read
