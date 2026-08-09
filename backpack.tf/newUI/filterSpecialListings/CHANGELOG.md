# Version 1.0.0

- Hides sell and buy listings that have spells or strange parts attached
- Adds a per-column toggle button to reveal/hide special listings
- Fixed: searching by killstreak tier hid every single result — a listing was treated as "special" whenever it had *any* icon in `.item__icons`, but a Specialized/Professional Killstreak weapon's sheen/killstreaker (named, e.g. `attribute__deadly-daffodil`, or generic fallback, e.g. `attribute__killstreaker`) render there too. Those are now excluded from the check, since they're inherent to the killstreak tier rather than an extra attachment