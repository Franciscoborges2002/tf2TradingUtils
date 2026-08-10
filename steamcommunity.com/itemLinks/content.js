// itemLinks.js
import { COLOR_PANEL_BG, SITE_BRAND_COLORS } from "../../utils/constants/colors.js";
import {
  steamMarketUrl,
  backpackStatsUrl,
  stnTradingUrl,
  mannCoStoreUrl,
  marketplaceTfUrl,
  skinportUrl,
  crateTfUrl,
  getKnownCrateNumber,
} from "../../utils/itemLinks.js";

const QUALITY_WORDS = [
  "Normal", "Genuine", "Vintage", "Unusual", "Unique", "Community", "Valve",
  "Self-Made", "Customized", "Strange", "Completed", "Haunted", "Collector's", "Decorated Weapon",
];

const LINK_ACCENTS = {
  "Market": SITE_BRAND_COLORS.steam,
  "mannco.store": SITE_BRAND_COLORS.manncoStore,
  "skinport.com": SITE_BRAND_COLORS.skinport,
  "marketplace.tf": SITE_BRAND_COLORS.marketplaceTf,
  "crate.tf": SITE_BRAND_COLORS.crateTf,
  "bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "next.bp.tf stats": SITE_BRAND_COLORS.backpackTf,
  "bp.tf history": SITE_BRAND_COLORS.backpackTf,
  "next.bp.tf history": SITE_BRAND_COLORS.backpackTf,
  "stntrading.eu": SITE_BRAND_COLORS.stnTrading,
};

function pickContainer() {
  const c0 = document.querySelector("#iteminfo0");
  const c1 = document.querySelector("#iteminfo1");

  const h0 = c0?.querySelector("h1");
  if (h0) return { container: c0, title: h0 };

  const h1 = c1?.querySelector("h1");
  if (h1) return { container: c1, title: h1 };

  return null;
}

/**
 * Reads the quality word off the item's "Tags:" line (e.g. "Tags:
 * Unique, Crate, Bone-Chilling Bonanza Collection, Tradable,
 * Marketable") — the one reliable structured signal for it on this
 * page, used instead of assuming every item is Unique quality.
 */
function getQualityFromTags(container) {
  const tagsEl = [...container.querySelectorAll("span")]
    .find((el) => el.textContent.trim().startsWith("Tags:"));
  if (!tagsEl) return null;

  const tags = tagsEl.textContent.replace(/^Tags:\s*/, "").split(",").map((t) => t.trim());
  return QUALITY_WORDS.find((q) => tags.includes(q)) || null;
}

/**
 * The item's asset id — needed for the backpack.tf/next.backpack.tf
 * History links (backpack.tf/item/<assetId>), which aren't name-based
 * like everything else here. Pulled out of the "Inspect in Game" link's
 * steam://...+tf_econ_item_preview%20S<steamid>A<assetId>D<d> URI —
 * the only place this page exposes it.
 */
function getAssetId(container) {
  const inspectLink = container.querySelector('a[href*="tf_econ_item_preview"]');
  if (!inspectLink) return null;
  const match = (inspectLink.getAttribute("href") || "").match(/A(\d+)D/);
  return match ? match[1] : null;
}

/**
 * Parses the item's full display name down to the bare schema name,
 * plus the attributes the query-param-based links (next Bp Stats,
 * marketplace.tf) need. Unlike backpack.tf's hover popover, Steam's own
 * name literally includes Non-Craftable/Festivized/killstreak-tier/
 * quality/Australium text — so, similar to stntrading.eu/itemLinks,
 * it's all parsed straight out of the name, in the order Steam shows
 * them.
 *
 * @param {string} rawName
 * @param {string|null} qualityFromTags - from getQualityFromTags(); "Unique" assumed if not found
 */
function parseItemName(rawName, qualityFromTags) {
  let name = rawName.trim();

  const isNonCraftable = name.startsWith("Non-Craftable ");
  if (isNonCraftable) name = name.slice("Non-Craftable ".length);

  const festive = name.startsWith("Festivized ");
  if (festive) name = name.slice("Festivized ".length);

  let ksTier = 0;
  if (name.startsWith("Professional Killstreak ")) {
    ksTier = 3;
    name = name.slice("Professional Killstreak ".length);
  } else if (name.startsWith("Specialized Killstreak ")) {
    ksTier = 2;
    name = name.slice("Specialized Killstreak ".length);
  } else if (name.startsWith("Killstreak ")) {
    ksTier = 1;
    name = name.slice("Killstreak ".length);
  }

  const quality = qualityFromTags || "Unique";
  if (qualityFromTags && qualityFromTags !== "Unique" && qualityFromTags !== "Unusual" && name.startsWith(`${quality} `)) {
    name = name.slice((quality + " ").length);
  }

  const australium = name.startsWith("Australium ");
  if (australium) name = name.slice("Australium ".length);

  return { name, quality, craftable: !isNonCraftable, ksTier, australium, festive };
}

/** Killstreak-tier prefix text, for classic backpack.tf's stats page (which needs it baked into the name, not passed as a separate field). */
function ksPrefixFor(ksTier) {
  if (ksTier === 3) return "Professional Killstreak ";
  if (ksTier === 2) return "Specialized Killstreak ";
  if (ksTier === 1) return "Killstreak ";
  return "";
}

export function showItemLinks() {
  const picked = pickContainer();
  if (!picked) return false;

  const { container, title } = picked;
  const itemName = title.textContent.trim();
  if (!itemName) return false;

  // remove old injected links if item changed
  const prev = container.dataset.injectedFor || "";
  if (prev !== itemName) {
    container.querySelectorAll(".custom-market-links").forEach((n) => n.remove());
  }

  // Prevent duplicate for the same item — but the item info panel is
  // rendered by Steam's own framework and re-renders its content at
  // least once (e.g. once price data streams in), wiping out anything
  // we injected while leaving the container node (and its dataset)
  // intact. So don't just trust the marker — confirm the links are
  // actually still there before skipping.
  if (container.dataset.injectedFor === itemName && container.querySelector(".custom-market-links")) {
    return true;
  }

  const attrs = parseItemName(itemName, getQualityFromTags(container));
  const assetId = getAssetId(container);

  const marketUrl = steamMarketUrl(itemName);
  const manncoUrl = attrs.quality === "Unusual" ? null : mannCoStoreUrl({ name: itemName });
  const skinportUrlHref = attrs.quality === "Unusual" ? null : skinportUrl({ name: itemName });
  const stnUrl = stnTradingUrl({ name: itemName, craftable: attrs.craftable });
  const bpStatsUrl = backpackStatsUrl({
    name: ksPrefixFor(attrs.ksTier) + (attrs.australium ? "Australium " : "") + attrs.name,
    quality: attrs.quality,
    craftable: attrs.craftable,
  });
  const nextBpStatsUrl = backpackStatsUrl({
    name: attrs.name, quality: attrs.quality, craftable: attrs.craftable,
    ksTier: attrs.ksTier, australium: attrs.australium, next: true,
  });
  const historyUrl = assetId ? `https://backpack.tf/item/${assetId}` : null;
  const nextHistoryUrl = assetId ? `https://next.backpack.tf/item/${assetId}` : null;

  const links = document.createElement("div");
  links.className = "custom-market-links";
  links.style.marginTop = "8px";
  links.style.display = "flex";
  links.style.flexWrap = "wrap";
  links.style.gap = "8px";

  const linkList = [
    { label: "Market", href: marketUrl },
    { label: "mannco.store", href: manncoUrl },
    { label: "skinport.com", href: skinportUrlHref },
    { label: "bp.tf stats", href: bpStatsUrl },
    { label: "next.bp.tf stats", href: nextBpStatsUrl },
    { label: "bp.tf history", href: historyUrl },
    { label: "next.bp.tf history", href: nextHistoryUrl },
    { label: "stntrading.eu", href: stnUrl },
  ].filter((link) => link.href);

  linkList.forEach((link) => links.appendChild(makeLinkBtn(link)));

  title.insertAdjacentElement("afterend", links);
  container.dataset.injectedFor = itemName;

  // marketplace.tf needs a network fetch (defindex lookup, plus — for
  // crates — the bundled series-number table, since this page never
  // shows that number itself) — appended separately afterward so it
  // never blocks the links above, and skipped if the user's clicked a
  // different item (or this one's panel got re-rendered) by the time
  // it resolves.
  (async () => {
    const crateNumber = await getKnownCrateNumber(attrs.name);
    const href = await marketplaceTfUrl({
      name: attrs.name, quality: attrs.quality, craftable: attrs.craftable,
      ksTier: attrs.ksTier, australium: attrs.australium, festive: attrs.festive,
      crateNumber: crateNumber ?? undefined,
    });
    if (href && links.isConnected) links.appendChild(makeLinkBtn({ label: "marketplace.tf", href }));

    // crate.tf only has pages for crates/cases — crateTfUrl() returns
    // null with no crate number, so this naturally stays absent for
    // every other item rather than needing its own type check here.
    const crateTfHref = await crateTfUrl({ name: attrs.name, crateNumber, craftable: attrs.craftable });
    if (crateTfHref && links.isConnected) links.appendChild(makeLinkBtn({ label: "crate.tf", href: crateTfHref }));
  })().catch((err) => console.warn("[TF2Utils] marketplace.tf/crate.tf link failed:", err));

  return true;
}

function makeLinkBtn({ label, href }) {
  const a = document.createElement("a");
  a.className = "custom-link-btn";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;" +
    "padding:6px 12px;border-radius:6px;text-decoration:none;" +
    `background:${COLOR_PANEL_BG};color:#ffffff;font-weight:600;font-size:12px;` +
    "border:1px solid rgba(255,255,255,0.15);transition:0.15s ease;" +
    `border-left:3px solid ${LINK_ACCENTS[label] || "#999"};`;

  a.addEventListener("mouseenter", () => { a.style.filter = "brightness(1.15)"; });
  a.addEventListener("mouseleave", () => { a.style.filter = "none"; });

  return a;
}
