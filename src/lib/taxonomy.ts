// ─── Naz Game Taxonomy — single source of truth ───
// Extracted from:
//   • Naz Taxonomy PowerPoint List.pptx
//   • Taxonomy with the List of Subgenres.pdf
//   • Naz_Persona_Handbook.pdf

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

export const ALL_SUB_GENRES = [...new Set(Object.values(SUB_GENRES).flat())].sort();

export const THEMES = [
  "Contemporary — Modern Day",
  "Contemporary — Popular Culture",
  "Contemporary — Sports and Athletics",
  "Contemporary — War",
  "Fantasy — Dark Fantasy",
  "Fantasy — High Magical Fantasy",
  "Fantasy — Low Magical Fantasy",
  "Fantasy — Mythology",
  "Historic — Ancient History",
  "Historic — Asian Imperial Age & Dynasties",
  "Historic — Industrial Era",
  "Historic — Medieval",
  "Historic — Modern Era",
  "Historic — Prehistoric",
  "Historic — Renaissance",
  "Historic — Western",
  "Horror — Gothic/Occult",
  "Horror — Monster",
  "Horror — Paranormal",
  "Horror — Psychological",
  "Horror — Slasher",
  "Mystery / Detective",
  "Other",
  "Science Fiction — Advanced Human Society",
  "Science Fiction — Alien Galaxy",
  "Science Fiction — Apocalyptic",
  "Science Fiction — Historical Science Fiction",
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
  "Asymmetrical Mission",
  "Attack/Defend",
  "Base Capture",
  "Best Score",
  "Build & Battle",
  "Capture the Flag",
  "Death Match",
  "Domination",
  "Dungeons/Raids",
  "Last One Standing / Survival",
  "Level Completion",
  "Level Editor",
  "Sandbox / Free Play",
  "Sports & Racing",
  "Story Mode / Campaign",
  "Wave Based Survival",
] as const;

export const ART_STYLES = [
  "Abstract",
  "Anime / Manga",
  "Cartoon",
  "Hand-Drawn",
  "Low Poly",
  "Minimalist",
  "Pixel Art",
  "Realistic",
  "Stylized Realistic",
  "Voxel",
] as const;

export const COMPETITIVENESS = [
  "Competitive",
  "Cooperative",
  "Non-Competitive",
  "Semi-Competitive",
] as const;

export const DIMENSIONALITY = [
  "2D",
  "2.5D",
  "3D",
  "VR",
] as const;

export const PERSPECTIVE = [
  "First Person",
  "Fixed Camera",
  "Isometric",
  "Side-Scrolling",
  "Third Person",
  "Top-Down",
] as const;

export const MONETIZATION = [
  "Free to Play",
  "Freemium",
  "Premium / Pay to Play",
  "Subscription",
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
  "Local Multiplayer",
  "MMO",
  "Online Multiplayer",
  "Single Player",
] as const;

// ─── Naz Motivational Gamer Personas ───
// Source: Naz Persona Handbook (Global Gamer Study 2025)
export const PERSONAS = [
  "Builders, Farmers, & Nurturers",
  "Competition Lovers",
  "Hero Protagonists",
  "Open World Rangers",
  "Planners & Tacticians",
  "Puzzlers & Personal Besters",
  "Second-Life Escapists",
  "Solo Adventurers",
  "Story-first Players",
  "Style-Conscious Party Players",
] as const;

export type Persona = (typeof PERSONAS)[number];

// ─── Sample game titles for auto-complete ───
// Real titles used in mockData for overlap / top-games charts
export const SAMPLE_TITLES = [
  "Age of Empires IV",
  "Apex Legends",
  "Assassin's Creed Valhalla",
  "Baldur's Gate 3",
  "Call of Duty: Modern Warfare III",
  "Counter-Strike 2",
  "Crusader Kings III",
  "Cyberpunk 2077",
  "Dark Souls III",
  "Destiny 2",
  "Diablo IV",
  "Dota 2",
  "Dragon's Dogma 2",
  "EA Sports FC 25",
  "Elden Ring",
  "Europa Universalis IV",
  "Forza Horizon 5",
  "God of War Ragnarök",
  "Grand Theft Auto V",
  "Hearts of Iron IV",
  "Helldivers 2",
  "Hogwarts Legacy",
  "Kingdom Come: Deliverance II",
  "League of Legends",
  "Manor Lords",
  "Medieval Dynasty",
  "Minecraft",
  "Mount & Blade II: Bannerlord",
  "No Man's Sky",
  "Palworld",
  "Path of Exile 2",
  "Red Dead Redemption 2",
  "Sid Meier's Civilization VI",
  "Starfield",
  "Stardew Valley",
  "Stellaris",
  "The Witcher 3: Wild Hunt",
  "Total War: Warhammer III",
  "Valorant",
  "Warhammer 40K: Space Marine 2",
] as const;

// ─── Pre-built game sets for quick selection ───
export const GAME_SETS = [
  "AAA Releases (Last 12 Months)",
  "Free-to-Play Top 50",
  "Indie Hits (Last 12 Months)",
  "New Releases (Last 60 Days)",
  "Top 20 RPGs (Lifetime)",
  "Top 20 Strategy Games (Lifetime)",
  "Top 30 Action-Adventure (Last 90 Days)",
  "Top 50 Steam Sellers (Last 30 Days)",
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
  "Female", "Male", "Non-binary", "Prefer not to say",
] as const;

export const HOUSEHOLD_INCOMES = [
  "Under $25K", "$25–50K", "$50–75K", "$75–100K", "$100–150K", "Over $150K",
] as const;

export const EDUCATION_LEVELS = [
  "High school", "Some college", "Bachelor's", "Graduate+",
] as const;

export const DEMOGRAPHIC_REGIONS = [
  "Asia Pacific", "Eastern Europe", "Latin America", "Middle East & Africa",
  "North America", "Oceania", "Western Europe",
] as const;

export const COUNTRIES = [
  "Argentina", "Australia", "Brazil", "Canada", "China", "Colombia",
  "Egypt", "France", "Germany", "India", "Indonesia", "Italy",
  "Japan", "Mexico", "Netherlands", "Nigeria", "Philippines", "Poland",
  "Russia", "Saudi Arabia", "South Africa", "South Korea", "Spain",
  "Sweden", "Thailand", "Turkey", "UAE", "United Kingdom",
  "United States", "Vietnam",
] as const;

export const DEVICE_OWNERSHIP = [
  "All platforms", "Console", "Console + Mobile", "Mobile",
  "PC", "PC + Console", "Tablet",
] as const;

export const EMPLOYMENT = [
  "Employed full-time", "Employed part-time", "Retired",
  "Self-employed", "Student", "Unemployed",
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
  "Achievement", "Competition", "Creativity", "Escapism",
  "Exploration", "Mastery", "Relaxation", "Social Connection",
  "Status & Recognition", "Storytelling",
] as const;

export const PLAYER_VALUES = [
  "Fair monetization", "Frequent updates", "Mechanical complexity",
  "Modding support", "Multiplayer", "Narrative depth",
  "Replayability", "Social features", "Solo experience",
  "Visual fidelity", "World-building",
] as const;

export const GAMING_FREQUENCIES = [
  "Casual (<5hrs/wk)", "Regular (5–15)", "Dedicated (15–30)", "Hardcore (30+)",
] as const;

export const PLATFORM_PREFERENCES = [
  "Console-first", "Mobile-first", "PC-first", "Platform agnostic",
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
  "Any gaming spend", "DLC/expansions", "Games", "In-game items", "Subscriptions",
] as const;

export const PURCHASE_TYPES = [
  "Any titles", "F2P titles", "Premium titles",
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
