// ─── Newzoo Game Taxonomy — single source of truth ───
// Extracted from:
//   • Newzoo Taxonomy PowerPoint List.pptx
//   • Taxonomy with the List of Subgenres.pdf
//   • Newzoo_Persona_Handbook.pdf

export const GENRES = [
  "Adventure",
  "Arcade",
  "Battle Arena",
  "Battle Royale",
  "Card Battle",
  "Casino",
  "Education",
  "Fighting",
  "Hyper Casual",
  "Idle",
  "Music",
  "Platformer",
  "Puzzle",
  "Racing",
  "Role Playing",
  "Sandbox",
  "Shooter",
  "Simulation",
  "Sports",
  "Strategy",
  "Tabletop",
] as const;

export type Genre = (typeof GENRES)[number];

export const SUB_GENRES: Record<Genre, string[]> = {
  Adventure: [
    "Action-Adventure",
    "Narrative Adventure",
    "Hack and Slash",
    "Interactive Story",
    "Survival Horror",
    "Survival Arena",
    "Open World Survival Craft",
    "Stealth Game",
    "Action Roguelike",
    "Dungeon Crawler",
    "Geo AR",
  ],
  Arcade: [
    "Party Game",
    "Social Deduction",
    "Endless Runner",
    "Arcade Royale",
    "Shoot 'Em Up",
    "Beat 'Em Up",
    "Bullet Hell",
  ],
  "Battle Arena": ["MOBA"],
  "Battle Royale": [
    "Third-Person Shooter",
    "First-Person Shooter",
    "Hero Shooter",
  ],
  "Card Battle": [
    "Roguelike Deckbuilder",
    "Collectible Card Game",
  ],
  Casino: [
    "Traditional Casino",
    "Meta Casino",
    "Adventure Casino",
    "Real Money Casino",
  ],
  Education: ["Coloring Game"],
  Fighting: [
    "Platform Fighter",
    "Traditional Fighter",
    "Arena Fighter",
    "Sports Fighting",
    "Beat 'Em Up",
  ],
  "Hyper Casual": [
    "Hyper Casual Runner/Racing",
    "Hyper Casual Action",
    "Hyper Casual Simulation",
    "Hyper Casual Puzzle",
    "ASMR",
    "Hyper Casual io",
  ],
  Idle: ["Idle Management", "Idle RPG"],
  Music: ["Rhythm Game", "Dancing Game"],
  Platformer: [
    "Puzzle-Platformer",
    "Side Scroller",
    "Metroidvania",
    "Precision Platformer",
  ],
  Puzzle: [
    "Match 3",
    "Puzzle & Decorate",
    "Bubble Shooter",
    "Jigsaw Puzzle",
    "Word Game",
    "Trivia Game",
    "Hidden Objects",
    "Physics-Based",
    "Room Escape",
    "Coloring Game",
    "Puzzle RPG",
    "Puzzle-Platformer",
    "Detective",
    "Brain Training",
    "Merge & Breeding",
  ],
  Racing: [
    "Arcade Racing",
    "Kart Racing",
    "Sim Racing",
    "Drift Racing",
    "Combat Racing",
    "Drag Racing",
    "Stunt Racing",
  ],
  "Role Playing": [
    "Action RPG",
    "MMORPG",
    "Tactical RPG",
    "Puzzle RPG",
    "Collection RPG",
    "Narrative RPG",
    "JRPG",
    "Idle RPG",
    "Souls-like",
    "Dungeon Crawler",
    "Action Roguelike",
    "Traditional Roguelike",
    "Geo AR",
  ],
  Sandbox: [
    "Adventure Sandbox",
    "Game Creation Platform",
    "Social Metaverse",
  ],
  Shooter: [
    "Third-Person Shooter",
    "First-Person Shooter",
    "Top-Down Shooter",
    "Hero Shooter",
    "Vehicular Combat",
    "Looter Shooter",
    "Arena Shooter",
    "Sniper Game",
    "Shoot 'Em Up",
    "Bullet Hell",
  ],
  Simulation: [
    "Life Sim",
    "Time Management",
    "Tycoon Management",
    "Merge & Breeding",
    "City Builder",
    "Romance",
    "Sports Management",
    "Vehicle Simulator",
    "Dress Up Game",
    "Job Simulator",
    "God Game",
    "Farming Sim",
    "Pet Sim",
    "Social Metaverse",
    "Battle Simulator",
    "Survival Sim",
  ],
  Sports: [
    "Arcade Sports",
    "Realistic Sports",
    "Sports Fighting",
  ],
  Strategy: [
    "Build & Battle",
    "Tower Defense",
    "Auto Battler",
    "Summon Battler",
    "4X",
    "Real-Time Strategy",
    "Grand Strategy",
    "Turn-Based Strategy",
    "Battle Simulator",
  ],
  Tabletop: [
    "Board Game",
    "Traditional Card",
    "Mahjong",
    "Solitaire",
    "Dice Game",
  ],
};

export const ALL_SUB_GENRES = Object.values(SUB_GENRES).flat();

export const THEMES = [
  // Historic
  "Historic — Modern Era",
  "Historic — Western",
  "Historic — Medieval",
  "Historic — Asian Imperial Age & Dynasties",
  "Historic — Prehistoric",
  "Historic — Ancient History",
  "Historic — Industrial Era",
  "Historic — Renaissance",
  // Fantasy
  "Fantasy — Mythology",
  "Fantasy — Dark Fantasy",
  "Fantasy — High Magical Fantasy",
  "Fantasy — Low Magical Fantasy",
  // Science Fiction
  "Science Fiction — Historical Science Fiction",
  "Science Fiction — Advanced Human Society",
  "Science Fiction — Alien Galaxy",
  "Science Fiction — Apocalyptic",
  // Contemporary
  "Contemporary — War",
  "Contemporary — Sports and Athletics",
  "Contemporary — Modern Day",
  "Contemporary — Popular Culture",
  // Horror
  "Horror — Gothic/Occult",
  "Horror — Monster",
  "Horror — Psychological",
  "Horror — Slasher",
  "Horror — Paranormal",
  // Mystery
  "Mystery / Detective",
  // Other
  "Other",
] as const;

export const THEME_GROUPS = [
  "Historic",
  "Fantasy",
  "Science Fiction",
  "Contemporary",
  "Horror",
  "Mystery",
  "Other",
] as const;

export const GAME_MODES = [
  "Story Mode / Campaign",
  "Death Match",
  "Wave Based Survival",
  "Capture the Flag",
  "Domination",
  "Attack/Defend",
  "Build & Battle",
  "Base Capture",
  "Asymmetrical Mission",
  "Dungeons/Raids",
  "Sports & Racing",
  "Best Score",
  "Level Completion",
  "Last One Standing / Survival",
  "Sandbox / Free Play",
  "Level Editor",
] as const;

export const ART_STYLES = [
  "Realistic",
  "Stylized Realistic",
  "Cartoon",
  "Anime / Manga",
  "Pixel Art",
  "Voxel",
  "Abstract",
  "Minimalist",
  "Hand-Drawn",
  "Low Poly",
] as const;

export const COMPETITIVENESS = [
  "Competitive",
  "Semi-Competitive",
  "Cooperative",
  "Non-Competitive",
] as const;

export const DIMENSIONALITY = [
  "2D",
  "2.5D",
  "3D",
  "VR",
] as const;

export const PERSPECTIVE = [
  "First Person",
  "Third Person",
  "Top-Down",
  "Isometric",
  "Side-Scrolling",
  "Fixed Camera",
] as const;

export const MONETIZATION = [
  "Premium / Pay to Play",
  "Free to Play",
  "Subscription",
  "Freemium",
] as const;

export const MSRP_RANGES = [
  "Free",
  "$0.01 – $9.99",
  "$10.00 – $19.99",
  "$20.00 – $29.99",
  "$30.00 – $39.99",
  "$40.00 – $49.99",
  "$50.00 – $59.99",
  "$60.00 – $69.99",
  "$70.00+",
] as const;

export const PLAYER_NUMBER = [
  "Single Player",
  "Local Multiplayer",
  "Online Multiplayer",
  "MMO",
] as const;

// ─── Newzoo Motivational Gamer Personas ───
// Source: Newzoo Persona Handbook (Global Gamer Study 2025)
export const PERSONAS = [
  "Story-first Players",
  "Solo Adventurers",
  "Hero Protagonists",
  "Open World Rangers",
  "Style-Conscious Party Players",
  "Competition Lovers",
  "Planners & Tacticians",
  "Builders, Farmers, & Nurturers",
  "Second-Life Escapists",
  "Puzzlers & Personal Besters",
] as const;

export type Persona = (typeof PERSONAS)[number];

// ─── Sample game titles for auto-complete ───
// Real titles used in mockData for overlap / top-games charts
export const SAMPLE_TITLES = [
  "Kingdom Come: Deliverance II",
  "EA Sports FC 25",
  "Grand Theft Auto V",
  "Counter-Strike 2",
  "The Witcher 3: Wild Hunt",
  "Elden Ring",
  "Baldur's Gate 3",
  "Sid Meier's Civilization VI",
  "Medieval Dynasty",
  "Mount & Blade II: Bannerlord",
  "Total War: Warhammer III",
  "Europa Universalis IV",
  "Manor Lords",
  "Red Dead Redemption 2",
  "Forza Horizon 5",
  "Cyberpunk 2077",
  "Hogwarts Legacy",
  "Stardew Valley",
  "Minecraft",
  "Destiny 2",
  "Call of Duty: Modern Warfare III",
  "Apex Legends",
  "Valorant",
  "League of Legends",
  "Dota 2",
  "Palworld",
  "Helldivers 2",
  "Warhammer 40K: Space Marine 2",
  "Dragon's Dogma 2",
  "Assassin's Creed Valhalla",
  "God of War Ragnarök",
  "Dark Souls III",
  "Crusader Kings III",
  "Hearts of Iron IV",
  "Stellaris",
  "Age of Empires IV",
  "Starfield",
  "No Man's Sky",
  "Path of Exile 2",
  "Diablo IV",
] as const;

// ─── Pre-built game sets for quick selection ───
export const GAME_SETS = [
  "Top 50 Steam Sellers (Last 30 Days)",
  "Top 20 RPGs (Lifetime)",
  "Top 20 Strategy Games (Lifetime)",
  "Top 30 Action-Adventure (Last 90 Days)",
  "New Releases (Last 60 Days)",
  "Free-to-Play Top 50",
  "AAA Releases (Last 12 Months)",
  "Indie Hits (Last 12 Months)",
] as const;

// ─── Rule entity types for the segment query builder ───
export type RuleEntityType =
  | "genre"
  | "subGenre"
  | "theme"
  | "gameMode"
  | "artStyle"
  | "competitiveness"
  | "dimensionality"
  | "perspective"
  | "monetization"
  | "msrpRange"
  | "playerNumber"
  | "persona"
  | "title"
  | "gameSet";

export interface RuleEntity {
  type: RuleEntityType;
  label: string;
  values: readonly string[];
}

export const RULE_ENTITIES: RuleEntity[] = [
  { type: "genre", label: "Genre", values: GENRES },
  { type: "subGenre", label: "Sub-Genre", values: ALL_SUB_GENRES },
  { type: "theme", label: "Theme", values: THEMES },
  { type: "gameMode", label: "Game Mode", values: GAME_MODES },
  { type: "artStyle", label: "Art Style", values: ART_STYLES },
  { type: "competitiveness", label: "Competitiveness", values: COMPETITIVENESS },
  { type: "dimensionality", label: "Dimensionality", values: DIMENSIONALITY },
  { type: "perspective", label: "Perspective", values: PERSPECTIVE },
  { type: "monetization", label: "Monetization", values: MONETIZATION },
  { type: "msrpRange", label: "MSRP Range", values: MSRP_RANGES },
  { type: "playerNumber", label: "Player Number", values: PLAYER_NUMBER },
  { type: "persona", label: "Persona", values: PERSONAS },
  { type: "title", label: "Specific Title", values: SAMPLE_TITLES },
  { type: "gameSet", label: "Game Set", values: GAME_SETS },
];

// Convenience: flat list of all entity type labels for dropdown
export const ENTITY_TYPE_OPTIONS = RULE_ENTITIES.map((e) => ({
  type: e.type,
  label: e.label,
}));

// ─── Demographic attributes (WHO THEY ARE) ───

export const AGE_GROUPS = [
  "10–17", "18–24", "25–34", "35–44", "45–54", "55+",
] as const;

export const GENDERS = [
  "Male", "Female", "Non-binary", "Prefer not to say",
] as const;

export const HOUSEHOLD_INCOMES = [
  "Under $25K", "$25–50K", "$50–75K", "$75–100K", "$100–150K", "Over $150K",
] as const;

export const EDUCATION_LEVELS = [
  "High school", "Some college", "Bachelor's", "Graduate+",
] as const;

export const DEMOGRAPHIC_REGIONS = [
  "North America", "Western Europe", "Eastern Europe", "Asia Pacific",
  "Latin America", "Middle East & Africa", "Oceania",
] as const;

export const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Sweden", "Poland", "Brazil",
  "Mexico", "Argentina", "Japan", "South Korea", "China", "Australia",
  "India", "Indonesia", "Russia", "Turkey", "Saudi Arabia", "UAE",
  "South Africa", "Nigeria", "Egypt", "Thailand", "Vietnam",
  "Philippines", "Colombia",
] as const;

export const DEVICE_OWNERSHIP = [
  "PC", "Console", "Mobile", "Tablet", "PC + Console",
  "Console + Mobile", "All platforms",
] as const;

export const EMPLOYMENT = [
  "Student", "Employed full-time", "Employed part-time",
  "Self-employed", "Unemployed", "Retired",
] as const;

export interface DemographicAttribute {
  type: string;
  label: string;
  values: readonly string[];
}

export const DEMOGRAPHIC_ATTRIBUTES: DemographicAttribute[] = [
  { type: "ageGroup", label: "Age Group", values: AGE_GROUPS },
  { type: "gender", label: "Gender", values: GENDERS },
  { type: "income", label: "Household Income", values: HOUSEHOLD_INCOMES },
  { type: "education", label: "Education Level", values: EDUCATION_LEVELS },
  { type: "region", label: "Region", values: DEMOGRAPHIC_REGIONS },
  { type: "country", label: "Country", values: COUNTRIES },
  { type: "device", label: "Device Ownership", values: DEVICE_OWNERSHIP },
  { type: "employment", label: "Employment", values: EMPLOYMENT },
];

// ─── Psychographic attributes (WHY THEY PLAY) ───

export const GAMING_MOTIVATIONS = [
  "Escapism", "Social Connection", "Competition", "Achievement",
  "Exploration", "Creativity", "Relaxation", "Storytelling",
  "Mastery", "Status & Recognition",
] as const;

export const PLAYER_VALUES = [
  "Narrative depth", "Visual fidelity", "Social features",
  "Replayability", "World-building", "Mechanical complexity",
  "Multiplayer", "Solo experience", "Modding support",
  "Frequent updates", "Fair monetization",
] as const;

export const GAMING_FREQUENCIES = [
  "Casual (<5hrs/wk)", "Regular (5–15)", "Dedicated (15–30)", "Hardcore (30+)",
] as const;

export const PLATFORM_PREFERENCES = [
  "PC-first", "Console-first", "Mobile-first", "Platform agnostic",
] as const;

export interface PsychographicAttribute {
  type: string;
  label: string;
  values: readonly string[];
}

export const PSYCHOGRAPHIC_ATTRIBUTES: PsychographicAttribute[] = [
  { type: "motivation", label: "Gaming Motivation", values: GAMING_MOTIVATIONS },
  { type: "playerValue", label: "Player Value", values: PLAYER_VALUES },
  { type: "frequency", label: "Gaming Frequency", values: GAMING_FREQUENCIES },
  { type: "platformPref", label: "Platform Preference", values: PLATFORM_PREFERENCES },
  { type: "persona", label: "Gamer Persona", values: PERSONAS },
];

// ─── Monetization attributes (WHAT THEY PAY) ───

export const SPEND_CATEGORIES = [
  "Games", "In-game items", "DLC/expansions", "Subscriptions", "Any gaming spend",
] as const;

export const PURCHASE_TYPES = [
  "Premium titles", "F2P titles", "Any titles",
] as const;

export const PURCHASE_TIMEFRAMES = [30, 60, 90, 180, 365] as const;

// ─── Plural labels for multi-select pill display ───

export const ATTRIBUTE_PLURALS: Record<string, string> = {
  ageGroup: "age groups",
  gender: "genders",
  income: "income levels",
  education: "education levels",
  region: "regions",
  country: "countries",
  device: "devices",
  employment: "employment types",
  motivation: "motivations",
  playerValue: "values",
  frequency: "frequencies",
  platformPref: "platform prefs",
  persona: "personas",
};

export const ENTITY_TYPE_PLURALS: Record<string, string> = {
  genre: "genres",
  subGenre: "sub-genres",
  theme: "themes",
  gameMode: "game modes",
  artStyle: "art styles",
  competitiveness: "competitiveness levels",
  dimensionality: "dimensionalities",
  perspective: "perspectives",
  monetization: "monetization types",
  msrpRange: "MSRP ranges",
  playerNumber: "player modes",
  persona: "personas",
  title: "titles",
  gameSet: "game sets",
};
