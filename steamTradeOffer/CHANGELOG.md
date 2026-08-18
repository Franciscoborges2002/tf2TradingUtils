# Version 1.2.0

* Added tradeOfferPanel script (renamed from addCurrency)
* Fixed `bots` variable in content.js router missing a declaration, creating an implicit global
* tradeOfferPanel: added a button to clear a side of the trade, and repositioned the panel above the trade summary
* Added itemLinks script — bp.tf stats/History, stntrading.eu, mannco.store and marketplace.tf links added to the item action menu (the "..." button per item)
* itemLinks now also loads on a read-only sent/received offer (`/tradeoffer/<id>/`), not just while composing a new one — the item action menu exists there too
* tradeOfferPanel: added an "Add Item" section — add any item by name via live autocomplete search and a quantity, to bulk-add duplicates
* tradeOfferPanel: added a button to add every item currently visible in the inventory grid to the trade in one click
* pageContext: added the search/add-by-name/add-visible-page event handlers tradeOfferPanel's new section needs

# Version 1.1.0

* Added showTradeDetails scritp
* Added pageContext to get inv information in trades

# Version 1.0.0

* Created new script folder
* Added showDenominations
* Added routerof scripts in content.js