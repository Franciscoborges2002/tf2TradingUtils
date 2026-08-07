# Version 1.1.0 (v1.3.0)

- Renamed from link2Backpack to itemLinks, reflecting its broader scope
- Added mannco.store, marketplace.tf, backpack.tf classifieds (classic + next), Steam Market, and Wiki links, alongside the existing backpack.tf stats links
- Fixed: crates (e.g. "Mann Co. Supply Crate Series #34") linked to a broken bp.tf stats URL — the " Series #N" suffix isn't part of the schema name, so it's now stripped and re-attached as the trailing series-number path segment instead
- Fixed: an unknown/mistyped item page has no `<h1>` at all — stntrading.eu renders a ".error-box" page instead — so grabbing it directly crashed. Now checks for that error page and skips entirely

# Version 1.0.1

- Now this script supports unusuals linking.

# Version 1.0.0

- Creates a button with linking to redirect to backpack page