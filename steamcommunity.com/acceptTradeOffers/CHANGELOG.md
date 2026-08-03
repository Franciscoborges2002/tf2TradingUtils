# Version 1.0.0 (Version 1.3.0)

- Added an "Accept Offer" action next to incoming trade offers on the trade offers inbox page, so you don't have to open the full trade offer page just to accept
- Only added for offers that don't already show a native "Accept" action, and only for offers showing both "Respond to Offer" and "Decline Trade" (i.e. incoming offers awaiting a response)
- Accepts by POSTing directly to Steam's own accept endpoint, using the session id read from the `sessionid` cookie
- Added a background service worker to work around Steam's accept endpoint requiring a Referer that content scripts can't set directly — rewrites it via a short-lived `declarativeNetRequest` rule scoped to the one offer being accepted
