import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

async function main() {
  console.log("Generating mock data via Claude API...\n");

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `Generate realistic mock data for a gaming audience intelligence platform.
Return ONLY valid JSON (no markdown fences, no commentary).

PROJECT (hardcoded — include exactly as-is):
- id: "kcd2"
- title: "Kingdom Come: Deliverance II"
- lifecycle: "Launched"
- monetization: "Premium / P2P"
- launchDate: "Feb 2025"
- platforms: ["PC", "PlayStation", "Xbox"]
- primaryMarket: "Global"
- totalTrackedUsers: 820000
- totalAddressableAudience: (de-duplicated across segments, ~150000-160000)
- totalAdopters: (sum of segment adopters, should be ~4800)
- generalPopConversionRate: (totalAdopters / totalTrackedUsers as %)

SEGMENTS:
1. id:"seg1", name:"Simulation RPG Purists", tier:"Core", color:"#4C5BFF"
   - addressableMarket: 7000, conversionRate: 13, adopters: 910
   - avgPlaytimeHours: pick realistic value 55-80 (these are hardcore KCD1 fans)
   - Defining games: Kingdom Come: Deliverance, Mount & Blade II: Bannerlord, Disco Elysium, The Witcher 3

2. id:"seg2", name:"Mastery Combat Fans", tier:"Secondary", color:"#00C2A8"
   - addressableMarket: 50000, conversionRate: 3, adopters: 1500
   - avgPlaytimeHours: pick realistic value 25-40
   - Defining games: Elden Ring, Sekiro: Shadows Die Twice, Dark Souls III, For Honor

3. id:"seg3", name:"Historical Open-World Explorers", tier:"Tertiary", color:"#F6A623"
   - addressableMarket: 120000, conversionRate: 2, adopters: 2400
   - avgPlaytimeHours: pick realistic value 15-30
   - Defining games: Red Dead Redemption 2, Assassin's Creed Valhalla, The Elder Scrolls V: Skyrim, Horizon Zero Dawn

GAME TITLES LIST (30 real games):
Provide exactly 30 REAL game titles that a KCD2 audience would genuinely play.
Order them by relevance. Include games like:
Kingdom Come: Deliverance, The Witcher 3: Wild Hunt, Mount & Blade II: Bannerlord,
Elden Ring, Red Dead Redemption 2, Baldur's Gate 3, Skyrim, Dark Souls III,
Medieval Dynasty, Crusader Kings III, Dragon's Dogma 2, Assassin's Creed Valhalla,
Sekiro, Disco Elysium, For Honor, Mordhau, etc.
All 30 must be real, commercially released titles.

COMPARATOR TITLES:
- comparator1: "Dragon's Dogma 2"
- comparator2: "Baldur's Gate 3"

OVERLAP MATRIX (must sum to ~820000 totalTrackedUsers):
- "No Segment": userCount ~640000, conversionRate 0.2-0.4
- "1 Segment": userCount ~140000, conversionRate 1.5-3
- "2 Segments": userCount ~35000, conversionRate 5-9
- "All 3 Segments": userCount ~5000, conversionRate 10-16

GHT ENRICHMENT per segment:
- age buckets: 18-24, 25-34, 35-44, 45+ (must sum to 100)
- gender: Male, Female, Other (must sum to 100)
  - Seg1 (Simulation RPG): skews older male (75-82% male, older age)
  - Seg2 (Combat): skews younger male (80-88% male, younger)
  - Seg3 (Open-World): more balanced (60-70% male, broad age spread)
- personas: Immersed, Achiever, Explorer, Socialiser, Competitor (must sum to 100)
  - Seg1 skews Immersed, Seg2 skews Competitor/Achiever, Seg3 skews Explorer
- newsChannels: 5 real channels per segment (YouTube, Reddit, Steam News, Discord, Twitter/X, Twitch, IGN, PC Gamer, Podcasts, etc.)

AVG PLAYTIME PER SEGMENT:
- seg1: primaryTitle = "Kingdom Come: Deliverance"
- seg2: primaryTitle = "Elden Ring"
- seg3: primaryTitle = "Red Dead Redemption 2"

Return this exact JSON structure:
{
  "segments": [...],
  "project": {...},
  "overlapMatrix": [...],
  "gameTitles": ["<30 real titles>"],
  "comparatorTitles": { "comparator1": "Dragon's Dogma 2", "comparator2": "Baldur's Gate 3" },
  "ghtEnrichment": { "seg1": {...}, "seg2": {...}, "seg3": {...} },
  "avgPlaytimePerSegment": [...]
}`,
      },
    ],
  });

  let responseText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      responseText += event.delta.text;
      process.stdout.write(".");
    }
  }
  console.log("\n\nParsing Claude response...");

  // Strip markdown fences if present
  let jsonText = responseText.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const rawData = JSON.parse(jsonText);

  // --- Normalize Claude's output to match expected schema ---

  // Normalize GHT enrichment: convert object format to array format
  function normalizeGht(ght: any) {
    const normalized: Record<string, any> = {};
    for (const segId of ["seg1", "seg2", "seg3"]) {
      const seg = ght[segId];
      normalized[segId] = {
        age: Array.isArray(seg.age)
          ? seg.age
          : Object.entries(seg.age).map(([bucket, pct]) => ({ bucket, pct })),
        gender: Array.isArray(seg.gender)
          ? seg.gender
          : Object.entries(seg.gender).map(([label, pct]) => ({ label, pct })),
        personas: Array.isArray(seg.personas)
          ? seg.personas
          : Object.entries(seg.personas).map(([label, pct]) => ({ label, pct })),
        newsChannels: seg.newsChannels,
      };
    }
    return normalized;
  }

  // Normalize overlap matrix: ensure correct keys exist
  function normalizeOverlapMatrix(matrix: any[]) {
    return matrix.map((row: any, i: number) => ({
      label: row.label,
      segmentsQualified: row.segmentsQualified ?? row.segmentCount ?? i,
      userCount: row.userCount,
      adopters: row.adopters ?? Math.round(row.userCount * (row.conversionRate / 100)),
      conversionRate: row.conversionRate,
    }));
  }

  // Remove extra fields from segments (keep only what the app expects)
  function normalizeSegments(segs: any[]) {
    return segs.map((s: any) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      color: s.color,
      addressableMarket: s.addressableMarket,
      adopters: s.adopters,
      conversionRate: s.conversionRate,
      avgPlaytimeHours: s.avgPlaytimeHours,
    }));
  }

  // Normalize avgPlaytimePerSegment: ensure segmentName, avgHours, color
  function normalizeAvgPlaytime(apt: any[], segs: any[]) {
    const segMap = Object.fromEntries(segs.map((s: any) => [s.id, s]));
    return apt.map((item: any) => {
      const seg = segMap[item.segmentId];
      return {
        segmentId: item.segmentId,
        segmentName: item.segmentName ?? seg?.name ?? item.segmentId,
        avgHours: item.avgHours ?? item.avgPlaytimeHours ?? seg?.avgPlaytimeHours ?? 0,
        primaryTitle: item.primaryTitle,
        color: item.color ?? seg?.color ?? "#000000",
      };
    });
  }

  const creativeData = {
    ...rawData,
    segments: normalizeSegments(rawData.segments),
    overlapMatrix: normalizeOverlapMatrix(rawData.overlapMatrix),
    ghtEnrichment: normalizeGht(rawData.ghtEnrichment),
    avgPlaytimePerSegment: normalizeAvgPlaytime(rawData.avgPlaytimePerSegment, rawData.segments),
  };

  const gameTitles: string[] =
    creativeData.gameTitles ??
    creativeData.topGamesBeforeAdoption?.map((g: any) => g.title) ??
    [];
  const { segments, project } = creativeData;

  // --- Computed data (mathematical, no LLM needed) ---

  // Scale: total adopters ~4810, top game might have ~1800 adopters
  function generateTopGames(
    titles: string[],
    startCount: number,
  ): { title: string; adopter_count: number }[] {
    let count = startCount;
    return titles.map((title: string) => {
      const val = count;
      count = Math.round(count * (0.82 + Math.random() * 0.1));
      return { title, adopter_count: val };
    });
  }

  const topGamesBeforeAdoption = generateTopGames(gameTitles, 1800);

  const topGamesPerSegment: Record<
    string,
    { title: string; adopter_count: number }[]
  > = {
    seg1: generateTopGames(gameTitles, 620),
    seg2: generateTopGames(gameTitles, 980).map((x, i) => ({
      ...x,
      adopter_count: Math.round(x.adopter_count * (0.7 + (i % 3) * 0.15)),
    })),
    seg3: generateTopGames(gameTitles, 1500).map((x, i) => ({
      ...x,
      adopter_count: Math.round(x.adopter_count * (0.5 + (i % 4) * 0.1)),
    })),
  };

  function generateOverlapIndex(
    titles: string[],
    startIdx: number,
    decayMin: number,
    decayRange: number,
  ): { title: string; overlap_index: number }[] {
    let idx = startIdx;
    return titles.map((title: string) => {
      const val = idx;
      idx = Math.round(idx * (decayMin + Math.random() * decayRange));
      return { title, overlap_index: val };
    });
  }

  const overlapIndex30Day = generateOverlapIndex(gameTitles, 842, 0.88, 0.06);
  const overlapIndex30DayPerSegment: Record<
    string,
    { title: string; overlap_index: number }[]
  > = {
    seg1: generateOverlapIndex(gameTitles, 842, 0.88, 0.06),
    seg2: generateOverlapIndex(gameTitles, 842, 0.88, 0.06).map((x) => ({
      ...x,
      overlap_index: Math.round(x.overlap_index * (0.6 + Math.random() * 0.5)),
    })),
    seg3: generateOverlapIndex(gameTitles, 842, 0.88, 0.06).map((x) => ({
      ...x,
      overlap_index: Math.round(x.overlap_index * (0.4 + Math.random() * 0.4)),
    })),
  };

  const lifetimeTitles = gameTitles.slice(0, 25);
  const overlapIndexLifetime = generateOverlapIndex(lifetimeTitles, 920, 0.89, 0.05);
  const overlapIndexLifetimePerSegment: Record<
    string,
    { title: string; overlap_index: number }[]
  > = {
    seg1: generateOverlapIndex(lifetimeTitles, 920, 0.89, 0.05),
    seg2: generateOverlapIndex(lifetimeTitles, 920, 0.89, 0.05).map((x) => ({
      ...x,
      overlap_index: Math.round(x.overlap_index * (0.7 + Math.random() * 0.4)),
    })),
    seg3: generateOverlapIndex(lifetimeTitles, 920, 0.89, 0.05).map((x) => ({
      ...x,
      overlap_index: Math.round(x.overlap_index * (0.5 + Math.random() * 0.3)),
    })),
  };

  // Adoption curve D1-D90
  const adoptionCurve: {
    day: number;
    seg1_pct: number;
    seg2_pct: number;
    seg3_pct: number;
  }[] = [];
  for (let d = 1; d <= 90; d++) {
    const t = d / 90;
    adoptionCurve.push({
      day: d,
      seg1_pct: Math.round(100 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      seg2_pct: Math.round(100 * (1 - Math.exp(-2.8 * t)) * 100) / 100,
      seg3_pct: Math.round(100 * (1 - Math.exp(-1.8 * t)) * 100) / 100,
    });
  }

  // Benchmarking curve D1-D90
  const benchmarkingCurve: {
    day: number;
    kcd2: number;
    category_avg: number;
    comparator1: number;
    comparator2: number;
  }[] = [];
  for (let d = 1; d <= 90; d++) {
    const t = d / 90;
    benchmarkingCurve.push({
      day: d,
      kcd2: Math.round(100 * (1 - Math.exp(-3.5 * t)) * 100) / 100,
      category_avg: Math.round(100 * (1 - Math.exp(-2.2 * t)) * 100) / 100,
      comparator1: Math.round(100 * (1 - Math.exp(-3.0 * t)) * 100) / 100,
      comparator2: Math.round(100 * (1 - Math.exp(-2.5 * t)) * 100) / 100,
    });
  }

  // --- Assemble final output ---
  const mockData = {
    segments: creativeData.segments,
    SEGMENT_COLORS: ["#4C5BFF", "#00C2A8", "#F6A623"],
    project: creativeData.project,
    overlapMatrix: creativeData.overlapMatrix,
    topGamesBeforeAdoption,
    topGamesPerSegment,
    overlapIndex30Day,
    overlapIndex30DayPerSegment,
    overlapIndexLifetime,
    overlapIndexLifetimePerSegment,
    avgPlaytimePerSegment: creativeData.avgPlaytimePerSegment,
    ghtEnrichment: creativeData.ghtEnrichment,
    adoptionCurve,
    benchmarkingCurve,
    comparatorTitles: creativeData.comparatorTitles,
  };

  const outPath = path.resolve(__dirname, "../lib/mockData.json");
  fs.writeFileSync(outPath, JSON.stringify(mockData, null, 2));
  console.log(`\nMock data written to ${outPath}`);
  console.log(`  Project: ${project.title} (${project.monetization})`);
  console.log(`  Segments: ${segments.map((s: any) => s.name).join(", ")}`);
  console.log(`  Game titles: ${gameTitles.length}`);
  console.log(`  Tracked users: ${project.totalTrackedUsers.toLocaleString()}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
