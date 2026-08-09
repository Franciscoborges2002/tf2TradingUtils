/**
 * Shared color palette for the extension's injected UI panels.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js). pageContext/content.js and the
 * per-site router content.js files are classic (non-module) content
 * scripts and can't use static import — see utils/constants/README.md.
 */

export const COLOR_ACCENT   = "#B35112"; // brown/orange — keys, primary actions
export const COLOR_DANGER   = "#9D312F"; // red — clear/danger, "you" side
export const COLOR_INFO     = "#395C78"; // blue — "them"/partner side
export const COLOR_METAL    = "#c0c0c0"; // silver — ref/rec/scrap
export const COLOR_PANEL_BG = "#201C1A"; // dark panel background

export const COLOR_BOT_TRUSTED   = "#2ecc71"; // green
export const COLOR_BOT_UNTRUSTED = "#e74c3c"; // red
export const COLOR_BOT_UNKNOWN   = "#f1c40f"; // yellow

// {border, background} pairs for the bot-trust badge
export const BOT_STATUS_COLORS = {
  trusted:   { border: COLOR_BOT_TRUSTED,   background: "rgba(46, 204, 113, 0.1)" },
  untrusted: { border: COLOR_BOT_UNTRUSTED, background: "rgba(231, 76, 60, 0.1)" },
  unknown:   { border: COLOR_BOT_UNKNOWN,   background: "rgba(241, 196, 15, 0.1)" },
};

/**
 * Approximate brand colors for external trading/reference sites, used
 * to color-code links to them (see stntrading.eu/itemLinks). Picked by
 * eye from each site's actual logo where one was available — not
 * guaranteed pixel-accurate, just enough to visually tell the
 * destinations apart at a glance.
 */
export const SITE_BRAND_COLORS = {
  backpackTf:    "#5B6D7E", // slate blue-gray, from their ribbon/flag logo mark
  steam:         "#1B2838", // Steam's dark navy
  marketplaceTf: "#2D7DD2", // blue half of their crossing blue/red logo
  manncoStore:   "#2D9CDB", // blue background of their "M" logo
  wiki:          "#D4AF37", // no logo given yet — placeholder gold accent
  postsTf:       "#E67E22", // orange from their logo — not wired up to any link currently
  stnTrading:    "#8E2A2A", // no logo given yet — placeholder dark red accent
  scrapTf:       "#C0392B", // no logo given yet — placeholder red accent
  skinport:      "#F2A93B", // no logo given yet — placeholder orange accent
};

// backpack.tf's own colors for each killstreak tier (see addKSButtons)
export const KS_TIER_COLORS = {
  none:         "#000000", // No Kit
  killstreak:   "#5B6060", // Normal KS
  specialized:  "#68765C", // Specialized KS
  professional: "#B15820", // Professional KS
};
