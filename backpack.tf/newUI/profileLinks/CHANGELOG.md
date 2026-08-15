# Version 1.0.0 (v1.3.0)

- Added a row of external profile links (Rep.TF, posts.tf, backpack.tf Forums, Steam Community, liquid.tf) to the profile banner's left column (`/profiles/<id>`, `/profiles/<id>/compare`), and liquid.tf alone to the "Steam Account Information" card header (`/profiles/<id>/user`)
- Anchored off the always-present username link rather than the site's own Rep.TF/posts.tf/Forums/Steam Community buttons
- Re-scans on a delay schedule plus a debounced MutationObserver, since next.backpack.tf is an SPA and route changes between the three page variants don't reload the page
