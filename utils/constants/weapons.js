/**
 * TF2 weapon names — every stock/reskinned item that occupies a
 * class's primary/secondary/melee (or PDA-equivalent) loadout slot,
 * across all 9 classes. Used by utils/tf2Currency.js's
 * isWeaponCurrency() to recognize a plain weapon as 0.5-scrap "currency
 * fodder" — see that function's own doc for why every match is priced
 * the same regardless of which weapon it actually is.
 *
 * A shared item usable by more than one class (e.g. "Shotgun",
 * "Pistol", "Bottle") appears once, not once per class — the name is
 * identical either way. Assembled from general TF2 weapon knowledge
 * rather than a verified schema/API pull, so treat this as a
 * best-effort list: a newly-released weapon, or a promotional/
 * event-exclusive one this missed, won't be recognized until added
 * here.
 *
 * Only usable from files loaded as ES modules (anything dynamically
 * imported via a router's content.js) — see utils/constants/README.md.
 */

export const WEAPONS = [
  // Scout
  "Scattergun", "Force-a-Nature", "Shortstop", "Soda Popper", "Baby Face's Blaster", "Back Scatter",
  "Pistol", "Lugermorph", "Winger", "Pretty Boy's Pocket Pistol", "Flying Guillotine",
  "Mad Milk", "Bonk! Atomic Punch", "Crit-a-Cola",
  "Bat", "Sandman", "Holy Mackerel", "Sun-on-a-Stick", "Fan O'War", "Atomizer", "Wrap Assassin",
  "Boston Basher", "Three-Rune Blade", "Candy Cane", "Batsaber", "Unarmed Combat",

  // Soldier
  "Rocket Launcher", "Direct Hit", "Black Box", "Rocket Jumper", "Liberty Launcher",
  "Cow Mangler 5000", "Original", "Beggar's Bazooka", "Air Strike",
  "Shotgun", "Buff Banner", "Gunboats", "Battalion's Backup", "Concheror", "Righteous Bison",
  "Reserve Shooter", "Mantreads", "Panic Attack",
  "Shovel", "Equalizer", "Pain Train", "Half-Zatoichi", "Market Gardener", "Disciplinary Action",
  "Escape Plan",

  // Pyro
  "Flame Thrower", "Backburner", "Degreaser", "Phlogistinator", "Rainblower", "Dragon's Fury",
  "Flare Gun", "Detonator", "Manmelter", "Scorch Shot", "Thermal Thruster", "Gas Passer",
  "Fire Axe", "Axtinguisher", "Homewrecker", "Powerjack", "Back Scratcher",
  "Sharpened Volcano Fragment", "Postal Pummeler", "Third Degree", "Lollichop",
  "Neon Annihilator", "Hot Hand", "Maul",

  // Demoman
  "Grenade Launcher", "Loch-n-Load", "Loose Cannon", "Iron Bomber", "Ali Baba's Wee Booties",
  "B.A.S.E Jumper",
  "Stickybomb Launcher", "Scottish Resistance", "Chargin' Targe", "Splendid Screen", "Tide Turner",
  "Quickiebomb Launcher",
  "Bottle", "Eyelander", "Scotsman's Skullcutter", "Ullapool Caber", "Claidheamh Mòr",
  "Persian Persuader", "Nessie's Nine Iron",

  // Heavy
  "Minigun", "Natascha", "Brass Beast", "Huo-Long Heater", "Tomislav",
  "Family Business",
  "Fists", "Killing Gloves of Boxing", "Gloves of Running Urgently", "Warrior's Spirit",
  "Fists of Steel", "Eviction Notice", "Apoco-Fists", "Holiday Punch",
  "Sandvich", "Dalokohs Bar", "Buffalo Steak Sandvich", "Second Banana",

  // Engineer
  "Frontier Justice", "Widowmaker", "Pomson 6000", "Rescue Ranger",
  "Wrangler",
  "Wrench", "Gunslinger", "Southern Hospitality", "Jag", "Eureka Effect",

  // Medic
  "Syringe Gun", "Blutsauger", "Crusader's Crossbow", "Overdose",
  "Medi Gun", "Kritzkrieg", "Quick-Fix", "Vaccinator",
  "Bonesaw", "Ubersaw", "Vita-Saw", "Amputator", "Solemn Vow",

  // Sniper
  "Sniper Rifle", "Bazaar Bargain", "Machina", "Hitman's Heatmaker", "Sydney Sleeper",
  "Fortified Compound",
  "SMG", "Cleaner's Carbine", "Jarate", "Darwin's Danger Shield", "Razorback", "Cozy Camper",
  "Kukri", "Tribalman's Shiv", "Bushwacka", "Shahanshah",

  // Spy
  "Revolver", "Ambassador", "L'Etranger", "Enforcer", "Diamondback", "Big Kill",
  "Knife", "Your Eternal Reward", "Conniver's Kunai", "Big Earner", "Spy-cicle", "Black Rose",
  "Sapper", "Red-Tape Recorder",
  "Invis Watch", "Cloak and Dagger", "Dead Ringer", "Enthusiast's Timepiece",
];
