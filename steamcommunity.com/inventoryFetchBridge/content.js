/**
 * @TF2TradingUtils - steamcommunity.com/inventoryFetchBridge
 * Runs in the PAGE'S JS context (world: "MAIN", document_start) on a
 * Steam inventory page (steamcommunity.com/profiles/<id>/inventory,
 * steamcommunity.com/id/<vanity>/inventory).
 *
 * unusualEffectBackground's grid-cell support originally made its own
 * fetch() call to steamcommunity.com's inventory JSON endpoint
 * (/inventory/<steamid64>/440/2?...) — but the page's own UI already
 * calls that same endpoint itself to render the grid (confirmed against
 * a real request the page made: /inventory/76561199013263968/440/2
 * ?l=english&count=75&preserve_bbcode=1&raw_asset_properties=1).
 * Making a second, separate fetch for the same data is wasteful, so
 * this instead wraps both window.fetch AND XMLHttpRequest to OBSERVE
 * the page's own calls to that endpoint (never blocking or altering
 * them) and caches the assetid -> item description mapping from every
 * response seen. Wrapping fetch alone wasn't enough — confirmed live,
 * 0 requests were ever observed that way, meaning this page's own
 * inventory-loading code uses XHR (likely older jQuery-era Steam code
 * mixed into this otherwise-modern page), not fetch.
 *
 * The page paginates (count=75 per call as you scroll a large
 * inventory), so responses are merged into one running map rather than
 * replacing it — the map only grows as more of the page's own requests
 * complete, which is also why isolated-world code re-asks for it on
 * every scan instead of caching a single snapshot itself.
 *
 * Must run at document_start: wrapping fetch/XHR only intercepts calls
 * made AFTER this script installs the wrappers, and the page's own
 * first inventory request can happen very early in the page's life.
 *
 * Isolated-world content scripts can't see this page-context data
 * directly (different JS world) — exposed via a request/response
 * CustomEvent bridge, same pattern steamTradeOffer/pageContext uses.
 *
 * Link:
 * https://github.com/Franciscoborges2002/tf2TradingUtils/tree/main/steamcommunity.com/inventoryFetchBridge
 */

const INVENTORY_URL_RE = /\/inventory\/\d+\/440\/2(?:\?|$)/;

// assetid -> that item's full description object (from the response's
// own `descriptions[]` array, matched via classid_instanceid).
const g_itemDescByAssetId = new Map();

function mergeInventoryResponse(data) {
  const descByClassInstance = new Map();
  for (const desc of data?.descriptions ?? []) {
    descByClassInstance.set(`${desc.classid}_${desc.instanceid}`, desc);
  }

  let added = 0;
  for (const asset of data?.assets ?? []) {
    const desc = descByClassInstance.get(`${asset.classid}_${asset.instanceid}`);
    if (desc && !g_itemDescByAssetId.has(asset.assetid)) added++;
    if (desc) g_itemDescByAssetId.set(asset.assetid, desc);
  }

  console.log(`[TF2Utils] inventoryFetchBridge: observed inventory response — +${added} new, ${g_itemDescByAssetId.size} known total.`);

  // Steam prerenders multiple inventory "pages" worth of tiles ahead of
  // the one currently shown (confirmed live: page 3's data loads,
  // display:none, before the user has ever clicked to page 2) — so new
  // data can arrive for tiles a consumer hasn't looked at yet, with no
  // DOM mutation of its own to signal that. Isolated-world code can't
  // see this map update directly (different JS world), so announce it.
  if (added > 0) window.dispatchEvent(new CustomEvent("tf2utils_inv_updated"));
}

function urlOf(input) {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return null;
}

const originalFetch = window.fetch;
window.fetch = function (...args) {
  const promise = originalFetch.apply(this, args);

  const url = urlOf(args[0]);
  if (url && INVENTORY_URL_RE.test(url)) {
    promise
      .then((res) => res.clone().json())
      .then(mergeInventoryResponse)
      .catch((err) => console.warn("[TF2Utils] inventoryFetchBridge: failed to read intercepted fetch response:", err));
  }

  return promise;
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this.__tf2utilsUrl = url;
  return originalXhrOpen.call(this, method, url, ...rest);
};

const originalXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (...args) {
  const url = urlOf(this.__tf2utilsUrl);
  if (url && INVENTORY_URL_RE.test(url)) {
    this.addEventListener("load", () => {
      try {
        mergeInventoryResponse(JSON.parse(this.responseText));
      } catch (err) {
        console.warn("[TF2Utils] inventoryFetchBridge: failed to read intercepted XHR response:", err);
      }
    });
  }
  return originalXhrSend.apply(this, args);
};

// ─────────────────────────────────────────────────────────────
// tf2utils_inv_get_map — request/response bridge. Payload:
// { eventId }. Responds on `eventId` with the current
// assetid -> description Map (grows over time as more of the page's
// own requests complete).
// ─────────────────────────────────────────────────────────────
window.addEventListener("tf2utils_inv_get_map", (e) => {
  const eventId = e.detail?.eventId;
  if (!eventId) return;
  window.dispatchEvent(new CustomEvent(eventId, { detail: g_itemDescByAssetId }));
});
