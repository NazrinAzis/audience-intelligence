// ─── Segment definitions ───
export const segments = [
  {
    id: "seg1",
    name: "Simulation RPG Purists",
    tier: "Core" as const,
    color: "#4F46E5",
    addressableMarket: 7_082,
    adopters: 971,
    conversionRate: 13.7,
    avgPlaytimeHours: 692,
  },
  {
    id: "seg2",
    name: "Mastery Combat Fans",
    tier: "Secondary" as const,
    color: "#00C2A8",
    addressableMarket: 51_486,
    adopters: 1_628,
    conversionRate: 3.2,
    avgPlaytimeHours: 318,
  },
  {
    id: "seg3",
    name: "Historical Explorers",
    tier: "Tertiary" as const,
    color: "#F6A623",
    addressableMarket: 124_565,
    adopters: 2_410,
    conversionRate: 1.9,
    avgPlaytimeHours: 204,
  },
];

export const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623"];

// ─── Project-level aggregates ───
export const project = {
  id: "kcd2",
  title: "Kingdom Come: Deliverance II",
  lifecycle: "Launched",
  monetization: "Premium / P2P",
  launchDate: "Feb 2025",
  platforms: ["PC", "PS5", "Xbox"],
  primaryMarket: "Global",
  totalAddressableAudience: 183_507,
  totalTrackedUsers: 820_000,
  generalPopConversionRate: 0.61,
  totalAdopters: 5_009,
};

// ─── Overlap matrix ───
export const overlapMatrix = [
  { label: "No Segment", segmentsQualified: 0, userCount: 639_007, adopters: 1_922, conversionRate: 0.24 },
  { label: "1 Segment", segmentsQualified: 1, userCount: 45_629, adopters: 2_159, conversionRate: 4.73 },
  { label: "2 Segments", segmentsQualified: 2, userCount: 10_036, adopters: 1_300, conversionRate: 12.95 },
  { label: "All 3 Segments", segmentsQualified: 3, userCount: 1_367, adopters: 363, conversionRate: 26.55 },
];

// ─── Top 30 games played in 30 days before adoption ───
const top30Titles = [
  "EA Sports FC 25", "Call of Duty HQ", "Kingdom Come: Deliverance", "Marvel Rivals",
  "Fortnite", "Path of Exile 2", "Grand Theft Auto V", "The Witcher 3: Wild Hunt",
  "Cyberpunk 2077", "NHL 25", "Diablo IV", "Red Dead Redemption 2", "Elden Ring",
  "Baldur's Gate 3", "Mount & Blade II: Bannerlord", "Dragon's Dogma 2",
  "Crusader Kings III", "Skyrim", "Assassin's Creed Valhalla", "The Elder Scrolls Online",
  "Dying Light 2", "Medieval Dynasty", "Anno 1800", "Disco Elysium", "For Honor",
  "Dark Souls III", "Sekiro", "Ghost of Tsushima", "Star Wars Outlaws", "Hogwarts Legacy",
];

function generateTopGames(seed: number): { title: string; adopter_count: number }[] {
  let count = 412 + seed * 7;
  return top30Titles.map((title) => {
    const val = count;
    count = Math.max(Math.round(count * (0.84 + ((seed * 17 + val) % 100) * 0.001)), 10);
    return { title, adopter_count: val };
  });
}

export const topGamesBeforeAdoption = generateTopGames(1);

export const topGamesPerSegment: Record<string, { title: string; adopter_count: number }[]> = {
  seg1: generateTopGames(1),
  seg2: generateTopGames(2).map((x, i) => ({ ...x, adopter_count: Math.round(x.adopter_count * (0.7 + (i % 3) * 0.15)) })),
  seg3: generateTopGames(3).map((x, i) => ({ ...x, adopter_count: Math.round(x.adopter_count * (0.5 + (i % 4) * 0.1)) })),
};

// ─── Overlap Index — 30-day prior window ───
const overlapIndex30Titles = [
  "Medieval Dynasty", "Crusader Kings III", "V Rising", "Dragon's Dogma 2",
  "Baldur's Gate 3", "Mount & Blade II: Bannerlord", "Kingdom Come: Deliverance",
  "New World: Aeternum", "Anno 1800", "Star Wars Outlaws", "Disco Elysium",
  "Atomic Heart", "Horizon Zero Dawn", "The Witcher 3", "Dying Light 2",
  "Assassin's Creed Valhalla", "Warhammer 40K: Space Marine 2", "Planet Zoo",
  "Two Point Campus", "7 Days to Die", "Arma Reforger", "Surviving the Aftermath",
  "Silent Hill 2 (2024)", "Avatar: Frontiers of Pandora", "Skull and Bones",
  "Banishers: Ghosts of New Eden", "Pacific Drive", "Alan Wake 2",
  "Alone in the Dark (2024)", "Vampire: The Masquerade – Swansong",
];

function generateOverlapIndex30(seed: number): { title: string; overlap_index: number }[] {
  let idx = 47 - seed * 2;
  return overlapIndex30Titles.map((title) => {
    const val = Math.max(idx, 1);
    idx = Math.max(Math.round(idx * (0.90 + ((seed * 13 + idx) % 50) * 0.001)), 1);
    return { title, overlap_index: val };
  });
}

export const overlapIndex30Day = generateOverlapIndex30(1);

export const overlapIndex30DayPerSegment: Record<string, { title: string; overlap_index: number }[]> = {
  seg1: generateOverlapIndex30(1),
  seg2: generateOverlapIndex30(2).map((x) => ({ ...x, overlap_index: Math.max(Math.round(x.overlap_index * 0.75), 1) })),
  seg3: generateOverlapIndex30(3).map((x) => ({ ...x, overlap_index: Math.max(Math.round(x.overlap_index * 0.55), 1) })),
};

// ─── Overlap Index — Lifetime ───
const overlapIndexLifetimeTitles = [
  "Medieval Dynasty", "Crusader Kings III", "Mount & Blade II: Bannerlord",
  "V Rising", "Lies of P", "Disco Elysium", "Kingdom Come: Deliverance",
  "Dragon's Dogma 2", "Elden Ring", "Baldur's Gate 3", "The Witcher 3",
  "For Honor", "Dark Souls III", "Sekiro", "Lords of the Fallen (2023)",
  "Armored Core VI", "Warhammer 40K: Darktide", "The First Berserker: Khazan",
  "Enotria: The Last Song", "Atomic Heart", "Anno 1800", "Red Dead Redemption 2",
  "Clair Obscur: Expedition 33", "Cyberpunk 2077", "Ghost of Tsushima",
];

function generateOverlapIndexLifetime(seed: number): { title: string; overlap_index: number }[] {
  let idx = 50 - seed * 2;
  return overlapIndexLifetimeTitles.map((title) => {
    const val = Math.max(idx, 1);
    idx = Math.max(Math.round(idx * (0.91 + ((seed * 11 + idx) % 40) * 0.001)), 1);
    return { title, overlap_index: val };
  });
}

export const overlapIndexLifetime = generateOverlapIndexLifetime(1);

export const overlapIndexLifetimePerSegment: Record<string, { title: string; overlap_index: number }[]> = {
  seg1: generateOverlapIndexLifetime(1),
  seg2: generateOverlapIndexLifetime(2).map((x) => ({ ...x, overlap_index: Math.max(Math.round(x.overlap_index * 0.8), 1) })),
  seg3: generateOverlapIndexLifetime(3).map((x) => ({ ...x, overlap_index: Math.max(Math.round(x.overlap_index * 0.6), 1) })),
};

// ─── Avg playtime per segment on primary qualifying title ───
export const avgPlaytimePerSegment = [
  { segmentId: "seg1", segmentName: "Simulation RPG Purists", avgHours: 692, primaryTitle: "Kingdom Come: Deliverance", color: "#4F46E5" },
  { segmentId: "seg2", segmentName: "Mastery Combat Fans", avgHours: 318, primaryTitle: "Elden Ring", color: "#00C2A8" },
  { segmentId: "seg3", segmentName: "Historical Explorers", avgHours: 204, primaryTitle: "Anno 1800", color: "#F6A623" },
];

// ─── GHT Enrichment per segment ───
export const ghtEnrichment: Record<string, {
  age: { bucket: string; pct: number }[];
  gender: { label: string; pct: number }[];
  personas: { label: string; pct: number }[];
  newsChannels: string[];
}> = {
  seg1: {
    age: [
      { bucket: "18-24", pct: 14 },
      { bucket: "25-34", pct: 36 },
      { bucket: "35-44", pct: 32 },
      { bucket: "45+", pct: 18 },
    ],
    gender: [
      { label: "Male", pct: 76 },
      { label: "Female", pct: 20 },
      { label: "Other", pct: 4 },
    ],
    personas: [
      { label: "Immersed", pct: 38 },
      { label: "Explorer", pct: 26 },
      { label: "Achiever", pct: 20 },
      { label: "Socialiser", pct: 10 },
      { label: "Competitor", pct: 6 },
    ],
    newsChannels: ["YouTube", "Reddit", "Steam News", "Discord", "Twitter/X"],
  },
  seg2: {
    age: [
      { bucket: "18-24", pct: 26 },
      { bucket: "25-34", pct: 38 },
      { bucket: "35-44", pct: 22 },
      { bucket: "45+", pct: 14 },
    ],
    gender: [
      { label: "Male", pct: 80 },
      { label: "Female", pct: 16 },
      { label: "Other", pct: 4 },
    ],
    personas: [
      { label: "Competitor", pct: 32 },
      { label: "Achiever", pct: 28 },
      { label: "Immersed", pct: 22 },
      { label: "Explorer", pct: 12 },
      { label: "Socialiser", pct: 6 },
    ],
    newsChannels: ["YouTube", "Twitch", "Twitter/X", "Reddit", "IGN"],
  },
  seg3: {
    age: [
      { bucket: "18-24", pct: 10 },
      { bucket: "25-34", pct: 28 },
      { bucket: "35-44", pct: 36 },
      { bucket: "45+", pct: 26 },
    ],
    gender: [
      { label: "Male", pct: 64 },
      { label: "Female", pct: 30 },
      { label: "Other", pct: 6 },
    ],
    personas: [
      { label: "Explorer", pct: 40 },
      { label: "Immersed", pct: 26 },
      { label: "Achiever", pct: 16 },
      { label: "Socialiser", pct: 12 },
      { label: "Competitor", pct: 6 },
    ],
    newsChannels: ["YouTube", "Reddit", "Podcasts", "Steam News", "History forums"],
  },
};

// ─── Adoption curve D1–D90 ───
// Realistic: seg1 reaches ~13.7%, seg2 ~3.2%, seg3 ~1.9% by D90
export const adoptionCurve: { day: number; seg1_pct: number; seg2_pct: number; seg3_pct: number }[] = (() => {
  const data: { day: number; seg1_pct: number; seg2_pct: number; seg3_pct: number }[] = [];
  for (let d = 1; d <= 90; d++) {
    const t = d / 90;
    data.push({
      day: d,
      seg1_pct: Math.round(13.7 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      seg2_pct: Math.round(3.2 * (1 - Math.exp(-2.8 * t)) * 100) / 100,
      seg3_pct: Math.round(1.9 * (1 - Math.exp(-2.0 * t)) * 100) / 100,
    });
  }
  return data;
})();

// ─── Adoption curve extended to D180 for time range filter ───
export const adoptionCurve180: typeof adoptionCurve = (() => {
  const data: { day: number; seg1_pct: number; seg2_pct: number; seg3_pct: number }[] = [];
  for (let d = 1; d <= 180; d++) {
    const t = d / 90;
    data.push({
      day: d,
      seg1_pct: Math.round(13.7 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      seg2_pct: Math.round(3.2 * (1 - Math.exp(-2.8 * t)) * 100) / 100,
      seg3_pct: Math.round(1.9 * (1 - Math.exp(-2.0 * t)) * 100) / 100,
    });
  }
  return data;
})();

// ─── Benchmarking D1–D90 ───
// KCD2 Core: ~13.7%, categoryAvg: ~8.2%, Dragon's Dogma 2: ~9.6%, Baldur's Gate 3: ~11.2%
export const benchmarkingCurve: {
  day: number;
  kcd2: number;
  category_avg: number;
  comparator1: number;
  comparator2: number;
}[] = (() => {
  const data: { day: number; kcd2: number; category_avg: number; comparator1: number; comparator2: number }[] = [];
  for (let d = 1; d <= 90; d++) {
    const t = d / 90;
    data.push({
      day: d,
      kcd2: Math.round(13.7 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      category_avg: Math.round(8.2 * (1 - Math.exp(-2.5 * t)) * 100) / 100,
      comparator1: Math.round(9.6 * (1 - Math.exp(-3.0 * t)) * 100) / 100,
      comparator2: Math.round(11.2 * (1 - Math.exp(-2.8 * t)) * 100) / 100,
    });
  }
  return data;
})();

// Extended to D180
export const benchmarkingCurve180: typeof benchmarkingCurve = (() => {
  const data: { day: number; kcd2: number; category_avg: number; comparator1: number; comparator2: number }[] = [];
  for (let d = 1; d <= 180; d++) {
    const t = d / 90;
    data.push({
      day: d,
      kcd2: Math.round(13.7 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      category_avg: Math.round(8.2 * (1 - Math.exp(-2.5 * t)) * 100) / 100,
      comparator1: Math.round(9.6 * (1 - Math.exp(-3.0 * t)) * 100) / 100,
      comparator2: Math.round(11.2 * (1 - Math.exp(-2.8 * t)) * 100) / 100,
    });
  }
  return data;
})();

export const comparatorTitles = {
  comparator1: "Dragon's Dogma 2",
  comparator2: "Baldur's Gate 3",
};

// ─── Region / Market breakdown ───
export const regionBreakdown = [
  { region: "Europe", addressable: 78_400, adopters: 2_605, convRate: 3.32, topMarkets: ["Germany", "UK", "France", "Poland", "Czech Republic"] },
  { region: "North America", addressable: 52_300, adopters: 1_340, convRate: 2.56, topMarkets: ["United States", "Canada"] },
  { region: "Asia Pacific", addressable: 31_200, adopters: 612, convRate: 1.96, topMarkets: ["Japan", "South Korea", "Australia"] },
  { region: "Latin America", addressable: 14_800, adopters: 298, convRate: 2.01, topMarkets: ["Brazil", "Argentina"] },
  { region: "Middle East & Africa", addressable: 6_807, adopters: 154, convRate: 2.26, topMarkets: ["Saudi Arabia", "South Africa"] },
];

export const topCountryBreakdown = [
  { country: "United States", addressable: 38_200, adopters: 980, convRate: 2.57, flag: "US" },
  { country: "Germany", addressable: 22_100, adopters: 890, convRate: 4.03, flag: "DE" },
  { country: "United Kingdom", addressable: 18_600, adopters: 645, convRate: 3.47, flag: "GB" },
  { country: "France", addressable: 12_800, adopters: 378, convRate: 2.95, flag: "FR" },
  { country: "Poland", addressable: 11_400, adopters: 412, convRate: 3.61, flag: "PL" },
  { country: "Czech Republic", addressable: 4_200, adopters: 280, convRate: 6.67, flag: "CZ" },
  { country: "Canada", addressable: 14_100, adopters: 360, convRate: 2.55, flag: "CA" },
  { country: "Brazil", addressable: 9_800, adopters: 196, convRate: 2.0, flag: "BR" },
  { country: "Japan", addressable: 12_600, adopters: 248, convRate: 1.97, flag: "JP" },
  { country: "Australia", addressable: 8_400, adopters: 198, convRate: 2.36, flag: "AU" },
];

// ─── Segment overlap — shared game affinity ───
export const segmentOverlapGames: Record<string, { title: string; seg1_pct: number; seg2_pct: number; seg3_pct: number }[]> = {
  all: [
    { title: "Kingdom Come: Deliverance", seg1_pct: 82, seg2_pct: 34, seg3_pct: 61 },
    { title: "The Witcher 3: Wild Hunt", seg1_pct: 74, seg2_pct: 52, seg3_pct: 48 },
    { title: "Mount & Blade II: Bannerlord", seg1_pct: 68, seg2_pct: 22, seg3_pct: 55 },
    { title: "Elden Ring", seg1_pct: 45, seg2_pct: 78, seg3_pct: 18 },
    { title: "Baldur's Gate 3", seg1_pct: 62, seg2_pct: 41, seg3_pct: 36 },
    { title: "Crusader Kings III", seg1_pct: 56, seg2_pct: 12, seg3_pct: 64 },
    { title: "Medieval Dynasty", seg1_pct: 71, seg2_pct: 8, seg3_pct: 58 },
    { title: "Dark Souls III", seg1_pct: 32, seg2_pct: 72, seg3_pct: 14 },
    { title: "Red Dead Redemption 2", seg1_pct: 48, seg2_pct: 38, seg3_pct: 42 },
    { title: "Anno 1800", seg1_pct: 44, seg2_pct: 6, seg3_pct: 52 },
  ],
};

// ─── Persona overlap per segment ───
export const personaOverlapPerSegment: Record<string, { persona: string; pct: number }[]> = {
  seg1: [
    { persona: "Solo Adventurers", pct: 34 },
    { persona: "Story-first Players", pct: 28 },
    { persona: "Planners & Tacticians", pct: 18 },
    { persona: "Open World Rangers", pct: 12 },
    { persona: "Builders, Farmers, & Nurturers", pct: 8 },
  ],
  seg2: [
    { persona: "Competition Lovers", pct: 32 },
    { persona: "Hero Protagonists", pct: 26 },
    { persona: "Open World Rangers", pct: 20 },
    { persona: "Solo Adventurers", pct: 14 },
    { persona: "Style-Conscious Party Players", pct: 8 },
  ],
  seg3: [
    { persona: "Solo Adventurers", pct: 30 },
    { persona: "Planners & Tacticians", pct: 24 },
    { persona: "Story-first Players", pct: 22 },
    { persona: "Builders, Farmers, & Nurturers", pct: 16 },
    { persona: "Puzzlers & Personal Besters", pct: 8 },
  ],
};

// ─── Behavioral profile data (monthly) ───

export const behavioralProfilePerSegment: Record<string, {
  mau: number;
  malePercent: number;
  femalePercent: number;
  avgMonthlyPlaytime: number;
  platformAvgPlaytime: number;
  playtimeDistribution: { bucket: string; totalShare: number; segmentShare: number }[];
  taxonomies: {
    genres: { name: string; mau: number }[];
    subGenres: { name: string; mau: number }[];
    mechanics: { name: string; mau: number }[];
    artStyles: { name: string; mau: number }[];
    themes: { name: string; mau: number }[];
  };
  includedGames: {
    title: string; publisher: string; genre: string; releaseDate: string;
    platforms: string[]; markets: number; mau: number; playerShare: number;
    avgPlaytime: number; playtimeIndex: number;
  }[];
}> = {
  seg1: {
    mau: 2_400_000, malePercent: 76, femalePercent: 24,
    avgMonthlyPlaytime: 21.5, platformAvgPlaytime: 14.2,
    playtimeDistribution: [
      { bucket: ">1hr", totalShare: 92, segmentShare: 96 },
      { bucket: ">5hrs", totalShare: 64, segmentShare: 82 },
      { bucket: ">10hrs", totalShare: 38, segmentShare: 61 },
      { bucket: ">25hrs", totalShare: 14, segmentShare: 32 },
      { bucket: ">50hrs", totalShare: 4, segmentShare: 12 },
    ],
    taxonomies: {
      genres: [{ name: "Role Playing", mau: 1_840_000 }, { name: "Simulation", mau: 1_290_000 }, { name: "Strategy", mau: 980_000 }],
      subGenres: [{ name: "Action RPG", mau: 1_520_000 }, { name: "Life Sim", mau: 890_000 }, { name: "Tactical RPG", mau: 720_000 }],
      mechanics: [{ name: "Story Mode / Campaign", mau: 1_680_000 }, { name: "Sandbox / Free Play", mau: 1_100_000 }, { name: "Level Completion", mau: 640_000 }],
      artStyles: [{ name: "Realistic", mau: 1_560_000 }, { name: "Stylized Realistic", mau: 980_000 }, { name: "Hand-Drawn", mau: 340_000 }],
      themes: [{ name: "Historic — Medieval", mau: 1_400_000 }, { name: "Fantasy — High Magical Fantasy", mau: 1_120_000 }, { name: "Science Fiction — Advanced Human Society", mau: 580_000 }],
    },
    includedGames: [
      { title: "Kingdom Come: Deliverance II", publisher: "Warhorse Studios", genre: "Role Playing", releaseDate: "Feb 2025", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 680_000, playerShare: 28.3, avgPlaytime: 32.4, playtimeIndex: 2.28 },
      { title: "Baldur's Gate 3", publisher: "Larian Studios", genre: "Role Playing", releaseDate: "Aug 2023", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 520_000, playerShare: 21.7, avgPlaytime: 28.1, playtimeIndex: 1.98 },
      { title: "Elden Ring", publisher: "Bandai Namco", genre: "Role Playing", releaseDate: "Feb 2022", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 440_000, playerShare: 18.3, avgPlaytime: 24.6, playtimeIndex: 1.73 },
      { title: "The Witcher 3: Wild Hunt", publisher: "CD Projekt", genre: "Role Playing", releaseDate: "May 2015", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 380_000, playerShare: 15.8, avgPlaytime: 18.2, playtimeIndex: 1.28 },
      { title: "Medieval Dynasty", publisher: "Toplitz Productions", genre: "Simulation", releaseDate: "Sep 2021", platforms: ["PC", "PS5", "Xbox"], markets: 38, mau: 290_000, playerShare: 12.1, avgPlaytime: 22.8, playtimeIndex: 1.61 },
      { title: "Mount & Blade II: Bannerlord", publisher: "TaleWorlds", genre: "Role Playing", releaseDate: "Oct 2022", platforms: ["PC", "PS5", "Xbox"], markets: 40, mau: 260_000, playerShare: 10.8, avgPlaytime: 19.4, playtimeIndex: 1.37 },
      { title: "Stardew Valley", publisher: "ConcernedApe", genre: "Simulation", releaseDate: "Feb 2016", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 240_000, playerShare: 10.0, avgPlaytime: 16.5, playtimeIndex: 1.16 },
      { title: "Crusader Kings III", publisher: "Paradox Interactive", genre: "Strategy", releaseDate: "Sep 2020", platforms: ["PC", "PS5", "Xbox"], markets: 36, mau: 180_000, playerShare: 7.5, avgPlaytime: 21.2, playtimeIndex: 1.49 },
    ],
  },
  seg2: {
    mau: 4_100_000, malePercent: 82, femalePercent: 18,
    avgMonthlyPlaytime: 26.3, platformAvgPlaytime: 14.2,
    playtimeDistribution: [
      { bucket: ">1hr", totalShare: 92, segmentShare: 98 },
      { bucket: ">5hrs", totalShare: 64, segmentShare: 88 },
      { bucket: ">10hrs", totalShare: 38, segmentShare: 72 },
      { bucket: ">25hrs", totalShare: 14, segmentShare: 44 },
      { bucket: ">50hrs", totalShare: 4, segmentShare: 18 },
    ],
    taxonomies: {
      genres: [{ name: "Role Playing", mau: 3_100_000 }, { name: "Shooter", mau: 2_800_000 }, { name: "Fighting", mau: 1_400_000 }],
      subGenres: [{ name: "Souls-like", mau: 2_600_000 }, { name: "Action RPG", mau: 2_200_000 }, { name: "Looter Shooter", mau: 1_100_000 }],
      mechanics: [{ name: "Death Match", mau: 2_400_000 }, { name: "Dungeons/Raids", mau: 1_800_000 }, { name: "Wave Based Survival", mau: 1_200_000 }],
      artStyles: [{ name: "Realistic", mau: 2_900_000 }, { name: "Stylized Realistic", mau: 1_600_000 }, { name: "Anime / Manga", mau: 800_000 }],
      themes: [{ name: "Fantasy — Dark Fantasy", mau: 2_600_000 }, { name: "Science Fiction — Apocalyptic", mau: 1_400_000 }, { name: "Horror — Gothic/Occult", mau: 900_000 }],
    },
    includedGames: [
      { title: "Elden Ring", publisher: "Bandai Namco", genre: "Role Playing", releaseDate: "Feb 2022", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 1_200_000, playerShare: 29.3, avgPlaytime: 34.8, playtimeIndex: 2.45 },
      { title: "Dark Souls III", publisher: "Bandai Namco", genre: "Role Playing", releaseDate: "Apr 2016", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 680_000, playerShare: 16.6, avgPlaytime: 28.2, playtimeIndex: 1.99 },
      { title: "God of War Ragnarök", publisher: "Sony", genre: "Adventure", releaseDate: "Nov 2022", platforms: ["PC", "PS5"], markets: 40, mau: 540_000, playerShare: 13.2, avgPlaytime: 22.4, playtimeIndex: 1.58 },
      { title: "Warhammer 40K: Space Marine 2", publisher: "Focus Entertainment", genre: "Shooter", releaseDate: "Sep 2024", platforms: ["PC", "PS5", "Xbox"], markets: 38, mau: 480_000, playerShare: 11.7, avgPlaytime: 18.6, playtimeIndex: 1.31 },
      { title: "Helldivers 2", publisher: "Sony", genre: "Shooter", releaseDate: "Feb 2024", platforms: ["PC", "PS5"], markets: 42, mau: 420_000, playerShare: 10.2, avgPlaytime: 21.5, playtimeIndex: 1.51 },
      { title: "Path of Exile 2", publisher: "Grinding Gear Games", genre: "Role Playing", releaseDate: "Dec 2024", platforms: ["PC", "PS5", "Xbox"], markets: 36, mau: 380_000, playerShare: 9.3, avgPlaytime: 26.8, playtimeIndex: 1.89 },
      { title: "Diablo IV", publisher: "Blizzard", genre: "Role Playing", releaseDate: "Jun 2023", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 340_000, playerShare: 8.3, avgPlaytime: 20.1, playtimeIndex: 1.42 },
      { title: "Dragon's Dogma 2", publisher: "Capcom", genre: "Role Playing", releaseDate: "Mar 2024", platforms: ["PC", "PS5", "Xbox"], markets: 40, mau: 280_000, playerShare: 6.8, avgPlaytime: 16.9, playtimeIndex: 1.19 },
    ],
  },
  seg3: {
    mau: 5_800_000, malePercent: 64, femalePercent: 36,
    avgMonthlyPlaytime: 14.8, platformAvgPlaytime: 14.2,
    playtimeDistribution: [
      { bucket: ">1hr", totalShare: 92, segmentShare: 94 },
      { bucket: ">5hrs", totalShare: 64, segmentShare: 68 },
      { bucket: ">10hrs", totalShare: 38, segmentShare: 42 },
      { bucket: ">25hrs", totalShare: 14, segmentShare: 18 },
      { bucket: ">50hrs", totalShare: 4, segmentShare: 6 },
    ],
    taxonomies: {
      genres: [{ name: "Adventure", mau: 4_200_000 }, { name: "Strategy", mau: 3_400_000 }, { name: "Simulation", mau: 2_800_000 }],
      subGenres: [{ name: "Action-Adventure", mau: 3_600_000 }, { name: "Grand Strategy", mau: 2_100_000 }, { name: "City Builder", mau: 1_600_000 }],
      mechanics: [{ name: "Story Mode / Campaign", mau: 4_400_000 }, { name: "Sandbox / Free Play", mau: 2_600_000 }, { name: "Level Editor", mau: 1_200_000 }],
      artStyles: [{ name: "Realistic", mau: 3_800_000 }, { name: "Stylized Realistic", mau: 2_400_000 }, { name: "Cartoon", mau: 1_000_000 }],
      themes: [{ name: "Historic — Medieval", mau: 3_200_000 }, { name: "Historic — Modern Era", mau: 2_600_000 }, { name: "Contemporary — War", mau: 1_400_000 }],
    },
    includedGames: [
      { title: "Assassin's Creed Valhalla", publisher: "Ubisoft", genre: "Adventure", releaseDate: "Nov 2020", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 1_400_000, playerShare: 24.1, avgPlaytime: 18.4, playtimeIndex: 1.24 },
      { title: "Civilization VI", publisher: "2K Games", genre: "Strategy", releaseDate: "Oct 2016", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 980_000, playerShare: 16.9, avgPlaytime: 22.6, playtimeIndex: 1.53 },
      { title: "Red Dead Redemption 2", publisher: "Rockstar Games", genre: "Adventure", releaseDate: "Oct 2018", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 860_000, playerShare: 14.8, avgPlaytime: 16.2, playtimeIndex: 1.09 },
      { title: "Age of Empires IV", publisher: "Xbox Game Studios", genre: "Strategy", releaseDate: "Oct 2021", platforms: ["PC"], markets: 36, mau: 620_000, playerShare: 10.7, avgPlaytime: 14.8, playtimeIndex: 1.00 },
      { title: "Total War: Warhammer III", publisher: "SEGA", genre: "Strategy", releaseDate: "Feb 2022", platforms: ["PC"], markets: 34, mau: 480_000, playerShare: 8.3, avgPlaytime: 20.1, playtimeIndex: 1.36 },
      { title: "Europa Universalis IV", publisher: "Paradox Interactive", genre: "Strategy", releaseDate: "Aug 2013", platforms: ["PC"], markets: 32, mau: 340_000, playerShare: 5.9, avgPlaytime: 24.8, playtimeIndex: 1.68 },
      { title: "Manor Lords", publisher: "Hooded Horse", genre: "Strategy", releaseDate: "Apr 2024", platforms: ["PC", "Xbox"], markets: 38, mau: 280_000, playerShare: 4.8, avgPlaytime: 12.6, playtimeIndex: 0.85 },
      { title: "Hogwarts Legacy", publisher: "Warner Bros.", genre: "Adventure", releaseDate: "Feb 2023", platforms: ["PC", "PS5", "Xbox"], markets: 42, mau: 240_000, playerShare: 4.1, avgPlaytime: 10.4, playtimeIndex: 0.70 },
    ],
  },
};

// ─── Extended demographic data per segment ───

export const demographicProfilePerSegment: Record<string, {
  age: { bucket: string; pct: number }[];
  gender: { label: string; pct: number }[];
  devices: { device: string; pct: number }[];
  regions: { region: string; pct: number }[];
}> = {
  seg1: {
    age: [{ bucket: "10–17", pct: 3 }, { bucket: "18–24", pct: 14 }, { bucket: "25–34", pct: 36 }, { bucket: "35–44", pct: 32 }, { bucket: "45–54", pct: 11 }, { bucket: "55+", pct: 4 }],
    gender: [{ label: "Male", pct: 76 }, { label: "Female", pct: 20 }, { label: "Non-binary", pct: 3 }, { label: "Prefer not to say", pct: 1 }],
    devices: [{ device: "PC", pct: 82 }, { device: "Console", pct: 54 }, { device: "Mobile", pct: 28 }, { device: "Tablet", pct: 12 }],
    regions: [{ region: "Europe", pct: 42 }, { region: "North America", pct: 28 }, { region: "Asia Pacific", pct: 16 }, { region: "Latin America", pct: 8 }, { region: "Middle East & Africa", pct: 6 }],
  },
  seg2: {
    age: [{ bucket: "10–17", pct: 8 }, { bucket: "18–24", pct: 32 }, { bucket: "25–34", pct: 34 }, { bucket: "35–44", pct: 18 }, { bucket: "45–54", pct: 6 }, { bucket: "55+", pct: 2 }],
    gender: [{ label: "Male", pct: 82 }, { label: "Female", pct: 14 }, { label: "Non-binary", pct: 3 }, { label: "Prefer not to say", pct: 1 }],
    devices: [{ device: "PC", pct: 74 }, { device: "Console", pct: 72 }, { device: "Mobile", pct: 34 }, { device: "Tablet", pct: 8 }],
    regions: [{ region: "North America", pct: 36 }, { region: "Europe", pct: 32 }, { region: "Asia Pacific", pct: 20 }, { region: "Latin America", pct: 8 }, { region: "Middle East & Africa", pct: 4 }],
  },
  seg3: {
    age: [{ bucket: "10–17", pct: 4 }, { bucket: "18–24", pct: 10 }, { bucket: "25–34", pct: 28 }, { bucket: "35–44", pct: 36 }, { bucket: "45–54", pct: 16 }, { bucket: "55+", pct: 6 }],
    gender: [{ label: "Male", pct: 64 }, { label: "Female", pct: 30 }, { label: "Non-binary", pct: 4 }, { label: "Prefer not to say", pct: 2 }],
    devices: [{ device: "PC", pct: 78 }, { device: "Console", pct: 48 }, { device: "Mobile", pct: 42 }, { device: "Tablet", pct: 18 }],
    regions: [{ region: "Europe", pct: 38 }, { region: "North America", pct: 30 }, { region: "Asia Pacific", pct: 18 }, { region: "Latin America", pct: 9 }, { region: "Middle East & Africa", pct: 5 }],
  },
};

// ─── Psychographic profile data per segment ───

export const psychographicProfilePerSegment: Record<string, {
  motivations: { motivation: string; segmentScore: number; platformAvg: number }[];
  playerValues: { value: string; pct: number }[];
  socialPlatforms: { platform: string; pct: number }[];
}> = {
  seg1: {
    motivations: [
      { motivation: "Exploration", segmentScore: 84, platformAvg: 52 },
      { motivation: "Storytelling", segmentScore: 78, platformAvg: 48 },
      { motivation: "Escapism", segmentScore: 72, platformAvg: 56 },
      { motivation: "Achievement", segmentScore: 68, platformAvg: 54 },
      { motivation: "Mastery", segmentScore: 62, platformAvg: 42 },
    ],
    playerValues: [
      { value: "World-building", pct: 82 },
      { value: "Narrative depth", pct: 78 },
      { value: "Replayability", pct: 64 },
      { value: "Solo experience", pct: 58 },
      { value: "Visual fidelity", pct: 52 },
    ],
    socialPlatforms: [
      { platform: "YouTube", pct: 78 },
      { platform: "Reddit", pct: 62 },
      { platform: "Discord", pct: 54 },
      { platform: "Twitch", pct: 42 },
      { platform: "Twitter/X", pct: 38 },
      { platform: "TikTok", pct: 24 },
      { platform: "Instagram", pct: 18 },
      { platform: "Facebook", pct: 14 },
    ],
  },
  seg2: {
    motivations: [
      { motivation: "Competition", segmentScore: 88, platformAvg: 44 },
      { motivation: "Mastery", segmentScore: 82, platformAvg: 42 },
      { motivation: "Achievement", segmentScore: 76, platformAvg: 54 },
      { motivation: "Social Connection", segmentScore: 64, platformAvg: 50 },
      { motivation: "Status & Recognition", segmentScore: 58, platformAvg: 32 },
    ],
    playerValues: [
      { value: "Mechanical complexity", pct: 86 },
      { value: "Visual fidelity", pct: 72 },
      { value: "Multiplayer", pct: 68 },
      { value: "Replayability", pct: 62 },
      { value: "Frequent updates", pct: 48 },
    ],
    socialPlatforms: [
      { platform: "YouTube", pct: 82 },
      { platform: "Twitch", pct: 68 },
      { platform: "Discord", pct: 64 },
      { platform: "Twitter/X", pct: 52 },
      { platform: "Reddit", pct: 46 },
      { platform: "TikTok", pct: 38 },
      { platform: "Instagram", pct: 22 },
      { platform: "Facebook", pct: 10 },
    ],
  },
  seg3: {
    motivations: [
      { motivation: "Exploration", segmentScore: 78, platformAvg: 52 },
      { motivation: "Relaxation", segmentScore: 72, platformAvg: 46 },
      { motivation: "Storytelling", segmentScore: 68, platformAvg: 48 },
      { motivation: "Creativity", segmentScore: 62, platformAvg: 40 },
      { motivation: "Escapism", segmentScore: 56, platformAvg: 56 },
    ],
    playerValues: [
      { value: "World-building", pct: 76 },
      { value: "Narrative depth", pct: 72 },
      { value: "Solo experience", pct: 68 },
      { value: "Visual fidelity", pct: 56 },
      { value: "Modding support", pct: 44 },
    ],
    socialPlatforms: [
      { platform: "YouTube", pct: 74 },
      { platform: "Reddit", pct: 56 },
      { platform: "Facebook", pct: 42 },
      { platform: "Discord", pct: 38 },
      { platform: "Twitter/X", pct: 32 },
      { platform: "Instagram", pct: 28 },
      { platform: "TikTok", pct: 22 },
      { platform: "Twitch", pct: 18 },
    ],
  },
};

// ─── Region breakdown per segment ───

export const regionBreakdownPerSegment: Record<string, typeof regionBreakdown> = {
  seg1: [
    { region: "Europe", addressable: 3_200, adopters: 480, convRate: 15.0, topMarkets: ["Germany", "Czech Republic", "Poland", "UK", "France"] },
    { region: "North America", addressable: 2_100, adopters: 290, convRate: 13.8, topMarkets: ["United States", "Canada"] },
    { region: "Asia Pacific", addressable: 980, adopters: 110, convRate: 11.2, topMarkets: ["Japan", "South Korea", "Australia"] },
    { region: "Latin America", addressable: 520, adopters: 58, convRate: 11.2, topMarkets: ["Brazil", "Mexico"] },
    { region: "Middle East & Africa", addressable: 282, adopters: 33, convRate: 11.7, topMarkets: ["Turkey", "South Africa"] },
  ],
  seg2: [
    { region: "North America", addressable: 18_500, adopters: 620, convRate: 3.4, topMarkets: ["United States", "Canada"] },
    { region: "Europe", addressable: 16_800, adopters: 510, convRate: 3.0, topMarkets: ["UK", "Germany", "France", "Sweden", "Spain"] },
    { region: "Asia Pacific", addressable: 10_200, adopters: 310, convRate: 3.0, topMarkets: ["Japan", "South Korea", "Australia"] },
    { region: "Latin America", addressable: 4_200, adopters: 128, convRate: 3.0, topMarkets: ["Brazil", "Argentina"] },
    { region: "Middle East & Africa", addressable: 1_786, adopters: 60, convRate: 3.4, topMarkets: ["UAE", "Saudi Arabia"] },
  ],
  seg3: [
    { region: "Europe", addressable: 52_000, adopters: 1_020, convRate: 2.0, topMarkets: ["Germany", "UK", "France", "Poland", "Italy"] },
    { region: "North America", addressable: 34_800, adopters: 640, convRate: 1.8, topMarkets: ["United States", "Canada"] },
    { region: "Asia Pacific", addressable: 22_400, adopters: 420, convRate: 1.9, topMarkets: ["Japan", "Australia", "India"] },
    { region: "Latin America", addressable: 10_200, adopters: 210, convRate: 2.1, topMarkets: ["Brazil", "Mexico"] },
    { region: "Middle East & Africa", addressable: 5_165, adopters: 120, convRate: 2.3, topMarkets: ["Turkey", "South Africa"] },
  ],
};

// ─── Helper: format numbers ───
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}
