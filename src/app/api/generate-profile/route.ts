import { NextRequest, NextResponse } from "next/server";

function parseMultiValue(s: string): string[] {
  if (!s) return [];
  return s.split("||").filter(Boolean);
}

function formatMultiValue(s: string): string {
  const parts = parseMultiValue(s);
  return parts.length > 1 ? parts.join(" OR ") : s;
}

interface GenerateProfileRequest {
  segmentName: string;
  segmentIndex: number;
  addressableMarket: number;
  conversionRate: number;
  rules: {
    playRules: Array<{ entityType: string; entityValue: string; ruleType: string; minHours: number }>;
    demoRules: Array<{ attribute: string; value: string }>;
    psychoRules: Array<{ attribute: string; value: string }>;
    moneyRules: Array<{ ruleType: string; comparison?: string; amount?: number; category?: string }>;
  };
  projectTitle: string;
  lifecycle: string;
  platforms: string[];
}

export interface GeneratedProfile {
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
  age: { bucket: string; pct: number }[];
  gender: { label: string; pct: number }[];
  devices: { device: string; pct: number }[];
  regions: { region: string; pct: number }[];
  motivations: { motivation: string; segmentScore: number; platformAvg: number }[];
  playerValues: { value: string; pct: number }[];
  socialPlatforms: { platform: string; pct: number }[];
  personas: { persona: string; pct: number }[];
  priorBehavior?: {
    topGames30dPrior: { title: string; adopterCount: number }[];
    overlapIndex30d: { title: string; overlapIndex: number }[];
    overlapIndexLifetime: { title: string; overlapIndex: number }[];
  };
}

// ─── Game title pools by genre/theme for realistic prior behavior data ───

const GAME_POOLS: Record<string, string[]> = {
  "Action RPG": ["Elden Ring", "Diablo IV", "Path of Exile 2", "Baldur's Gate 3", "Cyberpunk 2077", "The Witcher 3", "Dark Souls III", "Monster Hunter: World", "Nioh 2", "Dragon's Dogma 2", "Lies of P", "Black Myth: Wukong", "Genshin Impact", "Torchlight Infinite"],
  "RPG": ["Baldur's Gate 3", "Divinity: Original Sin 2", "Pillars of Eternity II", "Starfield", "Persona 5 Royal", "Final Fantasy XVI", "Dragon Age: The Veilguard"],
  "Role Playing": ["Baldur's Gate 3", "Divinity: Original Sin 2", "Pillars of Eternity II", "Starfield", "Persona 5 Royal", "Final Fantasy XVI", "Dragon Age: The Veilguard"],
  "Action": ["God of War Ragnarök", "Devil May Cry 5", "Bayonetta 3", "Sekiro", "Stellar Blade", "Hi-Fi Rush"],
  "Adventure": ["The Legend of Zelda: Tears of the Kingdom", "Uncharted 4", "A Plague Tale: Requiem", "It Takes Two", "Psychonauts 2"],
  "Strategy": ["Civilization VI", "Total War: Pharaoh", "Age of Empires IV", "Crusader Kings III", "XCOM 2", "Hearts of Iron IV"],
  "Simulation": ["Microsoft Flight Simulator", "Cities: Skylines II", "Farming Simulator 22", "Planet Coaster 2", "Two Point Campus"],
  "Souls-like": ["Elden Ring", "Dark Souls III", "Sekiro", "Lies of P", "Nioh 2", "Mortal Shell", "Lords of the Fallen", "Black Myth: Wukong"],
  "Open World": ["Elden Ring", "Cyberpunk 2077", "Red Dead Redemption 2", "GTA V", "Starfield", "Horizon Forbidden West", "Ghost of Tsushima"],
  "Dark Fantasy": ["Elden Ring", "Dark Souls III", "Diablo IV", "Baldur's Gate 3", "Lords of the Fallen", "Path of Exile 2"],
  "Medieval": ["Kingdom Come: Deliverance", "Mount & Blade II: Bannerlord", "Crusader Kings III", "A Plague Tale: Requiem", "Chivalry 2", "Medieval Dynasty"],
  "Fantasy": ["Baldur's Gate 3", "Elden Ring", "The Witcher 3", "Final Fantasy XVI", "Dragon Age: The Veilguard", "Genshin Impact"],
  "Sci-Fi": ["Cyberpunk 2077", "Starfield", "Mass Effect Legendary Edition", "Stellaris", "No Man's Sky", "Outer Wilds"],
  default: ["Counter-Strike 2", "Fortnite", "Minecraft", "Roblox", "League of Legends", "DOTA 2", "Apex Legends", "Valorant", "GTA V", "Red Dead Redemption 2", "Call of Duty: Modern Warfare III", "FIFA 24", "NBA 2K24", "Destiny 2", "World of Warcraft", "Overwatch 2", "Palworld", "Stardew Valley", "The Sims 4", "Among Us", "Rocket League", "Terraria", "Dead by Daylight", "Phasmophobia", "Lethal Company", "Hades II", "Balatro", "Helldivers 2", "Manor Lords", "Satisfactory"],
};

function generatePriorBehavior(
  addressableMarket: number,
  genres: string[],
  subGenres: string[],
  themes: string[],
  mechanics: string[],
): NonNullable<GeneratedProfile["priorBehavior"]> {
  // Collect relevant games from pools based on rules
  const relevantGames = new Set<string>();
  const allTags = [...genres, ...subGenres, ...themes, ...mechanics];
  for (const tag of allTags) {
    const pool = GAME_POOLS[tag];
    if (pool) pool.forEach((g) => relevantGames.add(g));
  }
  // Fill with defaults if not enough
  for (const g of GAME_POOLS.default) {
    if (relevantGames.size >= 30) break;
    relevantGames.add(g);
  }
  const gameList = Array.from(relevantGames).slice(0, 30);

  // Generate topGames30dPrior — sorted by adopter count descending
  const topGames30dPrior = gameList.map((title, i) => ({
    title,
    adopterCount: Math.round(addressableMarket * (0.35 - i * 0.009) * (0.8 + Math.random() * 0.4)),
  })).sort((a, b) => b.adopterCount - a.adopterCount);

  // Generate overlapIndex30d — higher for rule-matched games
  const overlapIndex30d = gameList.map((title) => {
    const isRuleMatch = allTags.some((tag) => GAME_POOLS[tag]?.includes(title));
    return {
      title,
      overlapIndex: isRuleMatch
        ? Math.round((8 + Math.random() * 35) * 10) / 10
        : Math.round((0.5 + Math.random() * 4) * 10) / 10,
    };
  }).sort((a, b) => b.overlapIndex - a.overlapIndex);

  // Generate overlapIndexLifetime — slightly different distribution
  const overlapIndexLifetime = gameList.map((title) => {
    const isRuleMatch = allTags.some((tag) => GAME_POOLS[tag]?.includes(title));
    return {
      title,
      overlapIndex: isRuleMatch
        ? Math.round((5 + Math.random() * 25) * 10) / 10
        : Math.round((0.8 + Math.random() * 3) * 10) / 10,
    };
  }).sort((a, b) => b.overlapIndex - a.overlapIndex);

  return { topGames30dPrior, overlapIndex30d, overlapIndexLifetime };
}

function heuristicProfile(req: GenerateProfileRequest): GeneratedProfile {
  const { addressableMarket, rules } = req;
  const mau = Math.round(addressableMarket * (3 + Math.random() * 5));

  // Infer gender split from rules
  const hasMaleDemo = rules.demoRules.some((r) => r.value?.toLowerCase().includes("male"));
  const hasFemalDemo = rules.demoRules.some((r) => r.value?.toLowerCase().includes("female"));
  let malePercent = 68 + Math.round(Math.random() * 16);
  let femalePercent = 100 - malePercent;
  if (hasMaleDemo) { malePercent = 80 + Math.round(Math.random() * 10); femalePercent = 100 - malePercent; }
  if (hasFemalDemo) { femalePercent = 55 + Math.round(Math.random() * 15); malePercent = 100 - femalePercent; }

  const avgMonthlyPlaytime = Math.round((12 + Math.random() * 18) * 10) / 10;
  const platformAvgPlaytime = 14.2;

  // Extract genre-related info from rules (split multi-values)
  const genres = rules.playRules
    .filter((r) => r.entityType === "genre" && r.entityValue)
    .flatMap((r) => parseMultiValue(r.entityValue));
  const subGenres = rules.playRules
    .filter((r) => r.entityType === "subGenre" && r.entityValue)
    .flatMap((r) => parseMultiValue(r.entityValue));
  const themes = rules.playRules
    .filter((r) => r.entityType === "theme" && r.entityValue)
    .flatMap((r) => parseMultiValue(r.entityValue));

  const mechanics = rules.playRules
    .filter((r) => r.entityType === "mechanic" && r.entityValue)
    .flatMap((r) => parseMultiValue(r.entityValue));

  const allGenres = [...new Set([...genres, "Role Playing", "Action", "Adventure", "Strategy", "Simulation"])].slice(0, 3);
  const allSubGenres = [...new Set([...subGenres, "Action RPG", "Open World", "Tactical RPG"])].slice(0, 3);
  const allThemes = [...new Set([...themes, "Fantasy — High Magical Fantasy", "Contemporary — War"])].slice(0, 3);

  return {
    mau,
    malePercent,
    femalePercent,
    avgMonthlyPlaytime,
    platformAvgPlaytime,
    playtimeDistribution: [
      { bucket: ">1hr", totalShare: 92, segmentShare: 93 + Math.round(Math.random() * 5) },
      { bucket: ">5hrs", totalShare: 64, segmentShare: 65 + Math.round(Math.random() * 20) },
      { bucket: ">10hrs", totalShare: 38, segmentShare: 40 + Math.round(Math.random() * 25) },
      { bucket: ">25hrs", totalShare: 14, segmentShare: 15 + Math.round(Math.random() * 25) },
      { bucket: ">50hrs", totalShare: 4, segmentShare: 5 + Math.round(Math.random() * 12) },
    ],
    taxonomies: {
      genres: allGenres.map((name, i) => ({ name, mau: Math.round(mau * (0.7 - i * 0.15)) })),
      subGenres: allSubGenres.map((name, i) => ({ name, mau: Math.round(mau * (0.6 - i * 0.12)) })),
      mechanics: [
        { name: "Story Mode / Campaign", mau: Math.round(mau * 0.7) },
        { name: "Sandbox / Free Play", mau: Math.round(mau * 0.45) },
        { name: "Level Completion", mau: Math.round(mau * 0.3) },
      ],
      artStyles: [
        { name: "Realistic", mau: Math.round(mau * 0.65) },
        { name: "Stylized Realistic", mau: Math.round(mau * 0.4) },
        { name: "Cartoon", mau: Math.round(mau * 0.18) },
      ],
      themes: allThemes.map((name, i) => ({ name, mau: Math.round(mau * (0.55 - i * 0.12)) })),
    },
    age: [
      { bucket: "10–17", pct: 5 + Math.round(Math.random() * 6) },
      { bucket: "18–24", pct: 18 + Math.round(Math.random() * 16) },
      { bucket: "25–34", pct: 28 + Math.round(Math.random() * 10) },
      { bucket: "35–44", pct: 18 + Math.round(Math.random() * 16) },
      { bucket: "45–54", pct: 6 + Math.round(Math.random() * 10) },
      { bucket: "55+", pct: 2 + Math.round(Math.random() * 4) },
    ],
    gender: [
      { label: "Male", pct: malePercent },
      { label: "Female", pct: femalePercent },
      { label: "Non-binary", pct: 2 + Math.round(Math.random() * 3) },
      { label: "Prefer not to say", pct: 1 },
    ],
    devices: [
      { device: "PC", pct: 65 + Math.round(Math.random() * 20) },
      { device: "Console", pct: 45 + Math.round(Math.random() * 25) },
      { device: "Mobile", pct: 20 + Math.round(Math.random() * 20) },
      { device: "Tablet", pct: 5 + Math.round(Math.random() * 12) },
    ],
    regions: [
      { region: "Europe", pct: 30 + Math.round(Math.random() * 14) },
      { region: "North America", pct: 25 + Math.round(Math.random() * 12) },
      { region: "Asia Pacific", pct: 14 + Math.round(Math.random() * 10) },
      { region: "Latin America", pct: 6 + Math.round(Math.random() * 6) },
      { region: "Middle East & Africa", pct: 3 + Math.round(Math.random() * 5) },
    ],
    motivations: [
      { motivation: "Exploration", segmentScore: 50 + Math.round(Math.random() * 38), platformAvg: 52 },
      { motivation: "Competition", segmentScore: 30 + Math.round(Math.random() * 50), platformAvg: 44 },
      { motivation: "Storytelling", segmentScore: 40 + Math.round(Math.random() * 40), platformAvg: 48 },
      { motivation: "Achievement", segmentScore: 50 + Math.round(Math.random() * 30), platformAvg: 54 },
      { motivation: "Mastery", segmentScore: 35 + Math.round(Math.random() * 45), platformAvg: 42 },
    ],
    playerValues: [
      { value: "Visual fidelity", pct: 40 + Math.round(Math.random() * 40) },
      { value: "Replayability", pct: 35 + Math.round(Math.random() * 35) },
      { value: "Narrative depth", pct: 30 + Math.round(Math.random() * 45) },
      { value: "Multiplayer", pct: 20 + Math.round(Math.random() * 45) },
      { value: "Modding support", pct: 15 + Math.round(Math.random() * 35) },
    ],
    socialPlatforms: [
      { platform: "YouTube", pct: 68 + Math.round(Math.random() * 18) },
      { platform: "Reddit", pct: 40 + Math.round(Math.random() * 25) },
      { platform: "Discord", pct: 35 + Math.round(Math.random() * 30) },
      { platform: "Twitch", pct: 25 + Math.round(Math.random() * 35) },
      { platform: "Twitter/X", pct: 25 + Math.round(Math.random() * 25) },
      { platform: "TikTok", pct: 15 + Math.round(Math.random() * 25) },
      { platform: "Instagram", pct: 10 + Math.round(Math.random() * 20) },
      { platform: "Facebook", pct: 8 + Math.round(Math.random() * 18) },
    ],
    personas: [
      { persona: "Solo Adventurers", pct: 20 + Math.round(Math.random() * 20) },
      { persona: "Competition Lovers", pct: 15 + Math.round(Math.random() * 20) },
      { persona: "Story-first Players", pct: 15 + Math.round(Math.random() * 18) },
      { persona: "Planners & Tacticians", pct: 10 + Math.round(Math.random() * 18) },
      { persona: "Open World Rangers", pct: 8 + Math.round(Math.random() * 15) },
    ],
    priorBehavior: generatePriorBehavior(addressableMarket, genres, subGenres, themes, mechanics),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateProfileRequest = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });

        const rulesDescription = [
          ...body.rules.playRules.filter((r) => r.entityValue).map((r) => `${r.ruleType}: ${r.entityType} = "${formatMultiValue(r.entityValue)}"${r.minHours > 0 ? ` (min ${r.minHours}h)` : ""}`),
          ...body.rules.demoRules.filter((r) => r.value).map((r) => `demographic: ${r.attribute} = "${formatMultiValue(r.value)}"`),
          ...body.rules.psychoRules.filter((r) => r.value).map((r) => `psychographic: ${r.attribute} = "${formatMultiValue(r.value)}"`),
          ...body.rules.moneyRules.map((r) => `monetization: ${r.ruleType}${r.category ? ` category="${formatMultiValue(r.category)}"` : ""}`),
        ].join(", ");

        const prompt = `You are a gaming audience intelligence analyst at Naz. Generate a realistic audience profile for a gaming segment.

CONTEXT:
- Game title: "${body.projectTitle}"
- Lifecycle: ${body.lifecycle}
- Platforms: ${body.platforms.join(", ")}
- Segment name: "${body.segmentName}"
- Segment rules: ${rulesDescription || "none specified"}
- Addressable market: ${body.addressableMarket.toLocaleString()} players
- Conversion rate: ${body.conversionRate}%

Return ONLY valid JSON (no markdown fences, no explanation) matching this EXACT schema:
{
  "mau": <monthly active users, number, should be 2-8x addressableMarket>,
  "malePercent": <number 50-90>,
  "femalePercent": <number = 100 - malePercent>,
  "avgMonthlyPlaytime": <hours, number 8-35, one decimal>,
  "platformAvgPlaytime": 14.2,
  "playtimeDistribution": [
    {"bucket": ">1hr", "totalShare": 92, "segmentShare": <number 90-98>},
    {"bucket": ">5hrs", "totalShare": 64, "segmentShare": <number 65-90>},
    {"bucket": ">10hrs", "totalShare": 38, "segmentShare": <number 40-70>},
    {"bucket": ">25hrs", "totalShare": 14, "segmentShare": <number 15-45>},
    {"bucket": ">50hrs", "totalShare": 4, "segmentShare": <number 5-20>}
  ],
  "taxonomies": {
    "genres": [{"name": "<genre>", "mau": <number>}, ...3 items],
    "subGenres": [{"name": "<subgenre>", "mau": <number>}, ...3 items],
    "mechanics": [{"name": "<mechanic>", "mau": <number>}, ...3 items],
    "artStyles": [{"name": "<style>", "mau": <number>}, ...3 items],
    "themes": [{"name": "<theme>", "mau": <number>}, ...3 items]
  },
  "age": [
    {"bucket": "10–17", "pct": <number>},
    {"bucket": "18–24", "pct": <number>},
    {"bucket": "25–34", "pct": <number>},
    {"bucket": "35–44", "pct": <number>},
    {"bucket": "45–54", "pct": <number>},
    {"bucket": "55+", "pct": <number>}
  ],
  "gender": [
    {"label": "Male", "pct": <number>},
    {"label": "Female", "pct": <number>},
    {"label": "Non-binary", "pct": <number>},
    {"label": "Prefer not to say", "pct": <number>}
  ],
  "devices": [
    {"device": "PC", "pct": <number>},
    {"device": "Console", "pct": <number>},
    {"device": "Mobile", "pct": <number>},
    {"device": "Tablet", "pct": <number>}
  ],
  "regions": [
    {"region": "Europe", "pct": <number>},
    {"region": "North America", "pct": <number>},
    {"region": "Asia Pacific", "pct": <number>},
    {"region": "Latin America", "pct": <number>},
    {"region": "Middle East & Africa", "pct": <number>}
  ],
  "motivations": [
    {"motivation": "<name>", "segmentScore": <number 30-95>, "platformAvg": <number 30-60>},
    ...5 items
  ],
  "playerValues": [{"value": "<name>", "pct": <number>}, ...5 items],
  "socialPlatforms": [{"platform": "<name>", "pct": <number>}, ...8 items],
  "personas": [{"persona": "<name>", "pct": <number>}, ...5 items]
}

Make the profile consistent with the segment's rules, game title context, and lifecycle stage. Use realistic gaming industry numbers. Genres/subgenres/themes should reflect the segment's behavioral rules.`;

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        const firstBlock = message.content?.[0];
        const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as GeneratedProfile;
          return NextResponse.json({ source: "claude", profile: result });
        }
      } catch {
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
    const profile = heuristicProfile(body);
    return NextResponse.json({ source: "heuristic", profile });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
