# Version 1.0.0 (v1.3.0)

- Added a liquid.tf store button (`https://liquid.tf/store/<steamid64>`) next to the existing posts.tf/Rep.TF/Forums buttons on `/profiles/<id>`, `/u/<vanity>` and `/friends/<id>`
- The steamid64 is read off one of the existing buttons' own hrefs rather than the page URL, since `/u/<vanity>` doesn't carry the numeric id there
