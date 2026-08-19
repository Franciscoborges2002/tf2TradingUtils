# Version 1.0.0

- Added: an Unusual item's icon now shows its own particle effect as a background, both in the inventory item info panel and in the inventory grid tiles (effect size adjustable via popup Settings)
- Grid tile data comes from `steamcommunity.com/inventoryFetchBridge`; effect images from `itempedia.tf`
- Now reads the effect-scale setting via the shared `utils/settings.js` instead of its own local read
