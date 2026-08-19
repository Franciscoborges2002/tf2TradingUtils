## Version 1.0.0

* Added bp.tf stats, bp.tf History, stntrading.eu, mannco.store, skinport.com, marketplace.tf and crate.tf (crates/cases only) links to the item action menu (the "..." button per item)
* bp.tf stats/History now follow the popup's "Default bp.tf version" setting instead of always using classic backpack.tf
* Added a Steam Market link, shown only for names containing "#" (crates) — Steam's own native "View in Community Market" link is already in this menu, but its href is never %-encoded, so a literal "#" gets read as the start of a URL fragment and silently truncates/redirects the link elsewhere
* Fixed mannco.store/skinport.com links for crate/case names that span multiple series under one shared display name (e.g. "Mann Co. Supply Crate", "Salvaged Mann Co. Supply Crate")
