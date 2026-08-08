/**
 * Base weapon names that actually have a Killstreak Kit / Kit Fabricator
 * in the game — i.e. the weapons a killstreak-tier filter/selector
 * actually makes sense for. Not every TF2 item can be killstreak-ified
 * (cosmetics, keys, metal, etc. can't), so anything not in this list
 * should never get killstreak UI.
 *
 * Sourced from kits.tf's own kit pricelist (https://kits.tf/pricelist) —
 * every weapon that has a tradeable "<Tier> Killstreak <Weapon> Kit"
 * listing there. Names are the bare weapon name (no "Killstreak "/
 * "Specialized Killstreak "/"Professional Killstreak " prefix, no
 * quality, no "Kit"/"Kit Fabricator" suffix) — match against a name
 * that's already had those stripped.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

export const KILLSTREAK_WEAPONS = [
  "AWPer Hand", "Air Strike", "Ambassador", "Amputator", "Apoco-Fists",
  "Atomizer", "Axtinguisher", "Baby Face's Blaster", "Back Scatter",
  "Back Scratcher", "Backburner", "Bat", "Bat Outta Hell", "Batsaber",
  "Bazaar Bargain", "Beggar's Bazooka", "Big Earner", "Big Kill",
  "Black Box", "Black Rose", "Blutsauger", "Bonesaw", "Boston Basher",
  "Bottle", "Brass Beast", "Bread Bite", "Bushwacka", "Candy Cane",
  "Chargin' Targe", "Claidheamh Mòr", "Classic", "Cleaner's Carbine",
  "Conniver's Kunai", "Conscientious Objector", "Cow Mangler 5000",
  "Crusader's Crossbow", "Degreaser", "Detonator", "Diamondback",
  "Direct Hit", "Disciplinary Action", "Dragon's Fury", "Enforcer",
  "Equalizer", "Escape Plan", "Eureka Effect", "Eviction Notice",
  "Eyelander", "Family Business", "Fan O'War", "Fire Axe", "Fists",
  "Fists of Steel", "Flame Thrower", "Flare Gun", "Flying Guillotine",
  "Force-a-Nature", "Fortified Compound", "Freedom Staff",
  "Frontier Justice", "Frying Pan", "Gloves of Running Urgently",
  "Grenade Launcher", "Gunslinger", "Half-Zatoichi", "Ham Shank",
  "Hitman's Heatmaker", "Holiday Punch", "Holy Mackerel", "Homewrecker",
  "Hot Hand", "Huntsman", "Huo-Long Heater", "Iron Bomber", "Iron Curtain",
  "Jag", "Killing Gloves of Boxing", "Knife", "Kritzkrieg", "Kukri",
  "L'Etranger", "Liberty Launcher", "Loch-n-Load", "Lollichop",
  "Loose Cannon", "Lugermorph", "Machina", "Manmelter", "Mantreads",
  "Market Gardener", "Maul", "Medi Gun", "Minigun", "Natascha",
  "Neon Annihilator", "Nessie's Nine Iron", "Nostromo Napalmer", "Original", "Overdose",
  "Pain Train", "Panic Attack", "Persian Persuader", "Phlogistinator",
  "Pistol", "Pomson 6000", "Postal Pummeler", "Powerjack",
  "Pretty Boy's Pocket Pistol", "Quick-Fix", "Quickiebomb Launcher",
  "Rainblower", "Rescue Ranger", "Reserve Shooter", "Revolver",
  "Righteous Bison", "Rocket Launcher", "Sandman", "Scattergun",
  "Scorch Shot", "Scotsman's Skullcutter", "Scottish Handshake",
  "Scottish Resistance", "Shahanshah", "Sharp Dresser",
  "Sharpened Volcano Fragment", "Shooting Star", "Short Circuit",
  "Shortstop", "Shotgun", "Shovel", "SMG", "Sniper Rifle", "Solemn Vow",
  "Southern Hospitality", "Splendid Screen", "Spy-Cicle",
  "Stickybomb Launcher", "Sun-on-a-Stick", "Sydney Sleeper",
  "Syringe Gun", "Third Degree", "Three-Rune Blade", "Tide Turner",
  "Tomislav", "Tribalman's Shiv", "Ullapool Caber", "Unarmed Combat",
  "Vaccinator", "Vita-Saw", "Wanga Prick", "Warrior's Spirit",
  "Widowmaker", "Winger", "Wrap Assassin", "Wrench",
  "Your Eternal Reward", "Übersaw",
];

/** Same list as a Set, for O(1) "is this weapon killstreak-eligible?" lookups. */
export const KILLSTREAK_WEAPONS_SET = new Set(KILLSTREAK_WEAPONS);
