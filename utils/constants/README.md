# Constants

Shared values for the extension's UI panels — colors and TF2 economy data that were previously hand-duplicated across several scripts.

## Usage

Import directly from the file you need:

```js
import { COLOR_ACCENT, COLOR_DANGER } from "../../../utils/constants/colors.js";
import { TF2_APPID, TF2_CONTEXTID, TF2_CURRENCY } from "../../../utils/constants/tf2Economy.js";
```

## A constraint worth knowing

This only works from files loaded as ES modules — i.e. anything dynamically `import()`-ed by a router's `content.js` (`tradeOfferPanel`, `showTradeDetails`, `botRep`, `oneClickOffer`, etc.).

`steamTradeOffer/pageContext/content.js` and the per-site router `content.js` files (`backpack.tf/content.js`, `steamTradeOffer/content.js`, etc.) are declared directly in `manifest.json` without `"type": "module"`, so Chrome treats them as classic scripts — they can't use a static `import` statement at all. Those files keep local copies of whatever constants they need, with a comment pointing back here so they don't silently drift. If a value changes here, grep for it in `pageContext/content.js` too.
