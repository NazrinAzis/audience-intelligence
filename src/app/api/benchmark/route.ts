import { NextRequest, NextResponse } from "next/server";

interface BenchmarkRequest {
  segmentName: string;
  segmentIndex: number;
  addressableMarket: number;
  rules: {
    playRules: Array<{ entityType: string; entityValue: string; ruleType: string }>;
    demoRules: Array<{ attribute: string; value: string }>;
    psychoRules: Array<{ attribute: string; value: string }>;
    moneyRules: Array<{ ruleType: string; category?: string }>;
  };
  projectTitle: string;
  lifecycle: string;
  platforms: string[];
}

export interface BenchmarkResult {
  benchmarkConvLow: number;
  benchmarkConvHigh: number;
  benchmarkConvMid: number;
  comparableTitles: {
    title: string;
    convRate: number;
    similarity: number;
    genre: string;
    year: number;
  }[];
  confidence: "High" | "Medium" | "Low";
}

function parseMultiValue(s: string): string[] {
  if (!s) return [];
  return s.split("||").filter(Boolean);
}

function formatMultiValue(s: string): string {
  const parts = parseMultiValue(s);
  return parts.length > 1 ? parts.join(" OR ") : s;
}

function heuristicBenchmark(req: BenchmarkRequest): BenchmarkResult {
  const { rules, addressableMarket } = req;
  const ruleCount =
    rules.playRules.filter((r) => r.entityValue).length +
    rules.demoRules.filter((r) => r.value).length +
    rules.psychoRules.filter((r) => r.value).length +
    rules.moneyRules.length;

  // More specific segments tend to have higher conversion
  const specificity = Math.min(ruleCount / 10, 1);
  const baseMid = 4 + specificity * 12 + Math.random() * 4;
  const spread = 2 + Math.random() * 3;

  const benchmarkConvMid = Math.round(baseMid * 10) / 10;
  const benchmarkConvLow = Math.round(Math.max(0.5, baseMid - spread) * 10) / 10;
  const benchmarkConvHigh = Math.round(Math.min(30, baseMid + spread) * 10) / 10;

  // Generate comparable titles
  const titlePool = [
    { title: "Elden Ring", genre: "Action RPG", year: 2022 },
    { title: "Baldur's Gate 3", genre: "RPG", year: 2023 },
    { title: "The Witcher 3", genre: "Action RPG", year: 2015 },
    { title: "Cyberpunk 2077", genre: "Action RPG", year: 2020 },
    { title: "Hogwarts Legacy", genre: "Action RPG", year: 2023 },
    { title: "Starfield", genre: "RPG", year: 2023 },
    { title: "God of War Ragnarok", genre: "Action-Adventure", year: 2022 },
    { title: "Red Dead Redemption 2", genre: "Action-Adventure", year: 2018 },
    { title: "Civilization VI", genre: "Strategy", year: 2016 },
    { title: "Total War: Warhammer III", genre: "Strategy", year: 2022 },
    { title: "Stardew Valley", genre: "Simulation", year: 2016 },
    { title: "Minecraft", genre: "Sandbox", year: 2011 },
  ];

  // Pick 3-8 titles depending on segment specificity
  const titleCount = Math.max(3, Math.min(8, Math.round(3 + ruleCount * 0.8 + Math.random() * 3)));
  const shuffled = [...titlePool].sort(() => Math.random() - 0.5);
  const comparableTitles = shuffled.slice(0, titleCount).map((t) => ({
    ...t,
    convRate: Math.round((benchmarkConvMid + (Math.random() - 0.5) * spread * 2) * 10) / 10,
    similarity: Math.round(50 + Math.random() * 45),
  }));

  let confidence: "High" | "Medium" | "Low" = "Medium";
  if (comparableTitles.length >= 5) confidence = "High";
  else if (comparableTitles.length <= 1) confidence = "Low";

  return {
    benchmarkConvLow,
    benchmarkConvHigh,
    benchmarkConvMid,
    comparableTitles,
    confidence,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BenchmarkRequest = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });

        const rulesDescription = [
          ...body.rules.playRules.filter((r) => r.entityValue).map((r) => `${r.ruleType}: ${r.entityType} = "${formatMultiValue(r.entityValue)}"`),
          ...body.rules.demoRules.filter((r) => r.value).map((r) => `demographic: ${r.attribute} = "${formatMultiValue(r.value)}"`),
          ...body.rules.psychoRules.filter((r) => r.value).map((r) => `psychographic: ${r.attribute} = "${formatMultiValue(r.value)}"`),
          ...body.rules.moneyRules.map((r) => `monetization: ${r.ruleType}${r.category ? ` category="${formatMultiValue(r.category)}"` : ""}`),
        ].join(", ");

        const prompt = `You are a gaming audience intelligence analyst at Newzoo. Given a game segment definition, estimate benchmark conversion rates based on comparable launched titles.

CONTEXT:
- Game title: "${body.projectTitle}"
- Lifecycle: ${body.lifecycle}
- Platforms: ${body.platforms.join(", ")}
- Segment name: "${body.segmentName}"
- Segment rules: ${rulesDescription || "none specified"}
- Addressable market: ${body.addressableMarket.toLocaleString()} players

Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "benchmarkConvLow": <25th percentile conv rate, number 0.5-15>,
  "benchmarkConvHigh": <75th percentile conv rate, number 5-30>,
  "benchmarkConvMid": <median conv rate, number 2-20>,
  "comparableTitles": [
    {"title": "<real game title>", "convRate": <number>, "similarity": <0-100>, "genre": "<genre>", "year": <number>},
    ... 3-8 items
  ],
  "confidence": "High" | "Medium" | "Low"
}

Confidence: High = 5+ comparable titles, Medium = 2-4 titles, Low = 0-1 titles.
Use realistic gaming industry data. More specific segments should have higher conversion rates.`;

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const firstBlock = message.content?.[0];
        const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as BenchmarkResult;
          return NextResponse.json({ source: "claude", ...result });
        }
      } catch {
        // Fall through to heuristic
      }
    }

    const result = heuristicBenchmark(body);
    return NextResponse.json({ source: "heuristic", ...result });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
