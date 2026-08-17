# Version 1.0.0

- Added — observes the inventory page's own item-data requests (fetch + XHR) and exposes the assetid -> description mapping to isolated-world scripts via a `tf2utils_inv_get_map` bridge, dispatching `tf2utils_inv_updated` whenever new data arrives
- Built for unusualEffectBackground's grid-cell support, without duplicating the page's own requests
