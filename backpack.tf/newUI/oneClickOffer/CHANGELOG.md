# Version 1.0.0

- Added a button next to eligible listings that instantly sends the trade offer with the correct currency — no review step
- Only added for bot-managed listings (the "BOT" user-agent badge) with a real Steam trade-offer link, not a marketplace.tf cart-add link
- Sell listings: reads the seller's real assetid straight from the item link and reuses the same "for_item" pre-fill mechanism as the old UI
- Buy orders: sells one of our items, matched by name from the listing header, paid in the partner's currency
- Skips generic unusual buy orders (effect unknown, can't match safely by name alone)
