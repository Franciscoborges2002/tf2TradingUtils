# Version 1.0.4 (v1.3.0)

- Added inventoryCurrencyCounter
- Added tradeOfferCurrency
- Added itemDescriptionToggle
- Fixed itemLinks/itemDescriptionToggle not applying to the first item shown when the inventory page loads — the render can finish slightly after their MutationObserver attaches, which then never fires again for that same item
- Renamed loadSteamLinks to steamLinks in script name display
- Renamed steamLinks to profileLinks (script and folder) — it's not really "Steam" links, it's third-party site links shown on a Steam profile page
- profileLinks: added a liquid.tf store button (`https://liquid.tf/store/<steamid64>`), plus Steam/Rep.TF/bp.tf/posts.tf/liquid.tf quick-links for the trade partner on each entry of the offers inbox/sent and trade history pages
- Added unusualEffectBackground — shows an Unusual item's own particle effect as its icon's background, in both the inventory item info panel and the inventory grid tiles

# Version 1.0.3

- Added groupTradeItems

# Version 1.0.2

- Added botRep and itemLinks

# Version 1.0.1

- Forked steamTradeHelper to steamTradeHelper script page
- Added routerof scripts in content.js

# Version 1.0.0

- Added steamLinks
- Added steamTradeHelper