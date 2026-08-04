# Version 1.0.0 (Version 1.3.0)

- Added a live currency counter to the Steam inventory page, shown while viewing the TF2 tab — since backpack.tf's own inventory cache can lag behind or fail to refresh
- Reads straight from Steam's own inventory endpoint (matched by `market_hash_name`), rather than scraping the rendered item grid or matching item icon hashes — handles pagination for large inventories automatically, sized off the page's own page-count control
- Shows keys, Earbuds, total metal, and a ref/rec/scrap breakdown with each denomination's icon
- Shows a total inventory value in ref once a key price and an Earbuds price are set in the popup's Settings view, with the ref/key icons next to each figure — otherwise shows a hint that pricing is missing
