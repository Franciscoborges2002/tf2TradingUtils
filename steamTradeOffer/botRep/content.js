/* 
Funtion to show the bot repulitation on the steamProfiles
*/
export async function showBotRepTrade(bots) {
  //Get steamid64
  const steamid64 = getTradePartnerSteamID64();
  if (!steamid64) return;

  const botInfo = bots[steamid64];
  console.log(botInfo);

  // 3) Decide status and style
  let statusText, detailsText, bgColor, borderColor;

  if (botInfo) {
    if (botInfo.trust) {
      statusText = "Trusted Bot";
      detailsText = botInfo.label || "This bot is in your trusted list.";
      bgColor = "rgba(46, 204, 113, 0.1)"; // greenish
      borderColor = "#2ecc71";
    } else {
      statusText = "⚠ Known Bot (Not Trusted)";
      detailsText = botInfo.label || "This bot is marked as NOT trusted.";
      bgColor = "rgba(231, 76, 60, 0.1)"; // reddish
      borderColor = "#e74c3c";
    }
  } else {
    statusText = "Unknown Bot Status";
    detailsText = "This profile is not in your bot list.";
    bgColor = "rgba(241, 196, 15, 0.1)"; // yellowish
    borderColor = "#f1c40f";
  } /* else {
    statusText = "Unknown Bot Status";
    detailsText = "This profile is not in your bot list.";
    bgColor = "rgba(241, 196, 15, 0.1)"; // yellowish
    borderColor = "#f1c40f";
  } */

  // 4) Inject styles
  const style = document.createElement("style");
  style.textContent = `
    .tf2utils-bot-badge {
      margin-top: 6px;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.4;
      border: 1px solid ${borderColor};
      background: ${bgColor};
      color: #fff;
      display: inline-block;
      max-width: 260px;
    }
    .tf2utils-bot-badge-title {
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }
    .tf2utils-bot-badge-desc {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);

  // Find a place to insert (profile header actions or header)
  const insertTarget =
    document.querySelector(".trade_partner_headline")

  if (!insertTarget) {
    console.warn("[TF2TradingUtils] No suitable insert target found.");
    return;
  }

  // Create badge element
  const badge = document.createElement("div");
  badge.className = "tf2utils-bot-badge";
  badge.innerHTML = `
    <span class="tf2utils-bot-badge-title">${statusText}</span>
    <span class="tf2utils-bot-badge-desc">${detailsText}</span>
  `;

  // Append after existing buttons / info
  insertTarget.appendChild(badge);

  console.log("[TF2TradingUtils] Bot badge injected.");
}

/* 
Get the SteamID64 from accountid
*/
function getTradePartnerSteamID64() {
  const a = document.querySelector(
    ".trade_partner_header .trade_partner_headline a[data-miniprofile]",
  );
  if (!a) return null;

  const accountIdStr = a.getAttribute("data-miniprofile");
  if (!accountIdStr) return null;

  const base = BigInt("76561197960265728");
  const accountId = BigInt(accountIdStr);
  return (base + accountId).toString(); // steamid64 as string
}
