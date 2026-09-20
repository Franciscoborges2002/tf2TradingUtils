# Utils

Shared code used across the extension's content scripts, split into standalone modules by concern (currency math, item name/schema parsing, Steam DOM helpers, URL builders, etc.) instead of being duplicated per-site — see `utils/constants/README.md` for the one real constraint on importing from here (classic, non-module content scripts can't use a static `import` at all).

## Folders

| Folder | What's in it |
|---|---|
| `constants/` | Smaller shared constant values — colors, quality/killstreak ids, item name quirks, user-facing messages. |
| `data/` | Bundled JSON reference data, fetched lazily at runtime — the TF2 schema's name to defindex map, crate series numbers, the trusted-bots list. |

## Files

| File | What it does |
|---|---|
| `itemLinks.js` | URL builders for every external reference site an itemLinks script can link to (Steam Market, backpack.tf, mannco.store, marketplace.tf, loadout.tf, etc.). |
| `tf2Currency.js` | TF2 currency data (keys/ref/rec/scrap/weapons) plus the math for converting, combining, and formatting amounts of it. |
| `tf2ItemSchema.js` | TF2 schema data and lookups — name↔defindex resolution, crate/case series numbers. |
| `tf2ItemName.js` | General TF2 item-name text helpers that don't belong in `itemLinks.js` or `tf2ItemSchema.js`. |
| `unusualEffects.js` | Unusual effect id/name lookup helpers, built from `UnusualIds.js`. |
| `UnusualIds.js` | The bundled Unusual particle effect id↔name mapping data itself. |
| `steamInventory.js` | Shared DOM helpers for steamcommunity.com's inventory page (which tab/owner is active, the selected item's panel, its description block, etc.). |
| `settings.js` | Canonical shape plus read/validate/update helpers for the popup's Settings, backed by `chrome.storage.local`. |
| `icons.js` | Loads and caches the bundled SVG icons. |
| `functions.js` | Small standalone helper(s) not tied to any of the above. |
