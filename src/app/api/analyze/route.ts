import { NextRequest, NextResponse } from "next/server";

interface AnalyzeRequest {
  projectContext: {
    title?: string;
    lifecycle?: string;
    monetization?: string;
    platforms?: string[];
    primaryMarket?: string;
  };
  segment: {
    name: string;
    playRules: Array<{ entityType: string; entityValue: string; minHours: number; ruleType: string }>;
    demoRules: Array<{ attribute: string; value: string }>;
    psychoRules: Array<{ attribute: string; value: string }>;
    moneyRules: Array<{ ruleType: string; comparison?: string; amount?: number; category?: string; purchased?: boolean; purchaseType?: string; timeframeDays?: number }>;
    sectionConnector: "AND" | "OR";
  };
}

function parseMultiValue(s: string): string[] {
  if (!s) return [];
  return s.split("||").filter(Boolean);
}

function multiValueExpansion(baseFactor: number, valueCount: number): number {
  if (valueCount <= 1) return baseFactor;
  return baseFactor * (1 + 0.15 * (valueCount - 1));
}

function heuristicEstimate(req: AnalyzeRequest) {
  const { segment, projectContext } = req;
  let base = 820_000;

  // Play rules: x (0.50-0.65) each, with multi-value expansion
  const playFilled = segment.playRules.filter((r) => r.entityValue);
  for (const rule of playFilled) {
    const nValues = parseMultiValue(rule.entityValue).length;
    const factor = multiValueExpansion(0.50 + Math.random() * 0.15, nValues);
    base *= Math.min(factor, 1);
    if (rule.minHours > 0) base *= Math.max(0.1, 1 - rule.minHours * 0.01);
  }

  // Demo rules: x (0.75-0.85) each
  const demoFilled = segment.demoRules.filter((r) => r.value);
  for (const rule of demoFilled) {
    const nValues = parseMultiValue(rule.value).length;
    const factor = multiValueExpansion(0.75 + Math.random() * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  // Psycho rules: x (0.80-0.90) each
  const psychoFilled = segment.psychoRules.filter((r) => r.value);
  for (const rule of psychoFilled) {
    const nValues = parseMultiValue(rule.value).length;
    const factor = multiValueExpansion(0.80 + Math.random() * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  // Money rules: x (0.70-0.80) each
  for (const rule of segment.moneyRules) {
    const nValues = parseMultiValue(rule.category || "").length || 1;
    const factor = multiValueExpansion(0.70 + Math.random() * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  // Cross-section connector
  if (segment.sectionConnector === "OR") {
    const activeSections = [playFilled.length, demoFilled.length, psychoFilled.length, segment.moneyRules.length].filter((n) => n > 0).length;
    if (activeSections > 1) base *= 1.15 + Math.random() * 0.10;
  }

  // Lifecycle factor
  if (projectContext.lifecycle === "Concept/Pre-Greenlight") base *= 1.1;
  if (projectContext.lifecycle === "Live Service") base *= 0.9;

  // Platform factor
  if (projectContext.platforms && projectContext.platforms.length >= 3) base *= 1.15;

  const size = Math.max(500, Math.min(820_000, Math.round(base)));
  const convRate = Math.round((2 + Math.random() * 14) * 10) / 10;
  const totalRules = playFilled.length + demoFilled.length + psychoFilled.length + segment.moneyRules.length;
  const gamesCount = Math.max(5, Math.round(30 + totalRules * 20 + Math.random() * 80));

  // Generate suggested name (use first value from multi-value fields)
  let suggestedName = segment.name;
  if (playFilled.length > 0) {
    const first = playFilled[0];
    const firstPlayVal = parseMultiValue(first.entityValue)[0] || first.entityValue;
    suggestedName = `${firstPlayVal} Players`;
    if (demoFilled.length > 0) {
      const firstDemoVal = parseMultiValue(demoFilled[0].value)[0] || demoFilled[0].value;
      suggestedName = `${firstDemoVal} ${firstPlayVal} Players`;
    }
    if (psychoFilled.length > 0) {
      const firstPsychoVal = parseMultiValue(psychoFilled[0].value)[0] || psychoFilled[0].value;
      suggestedName += ` (${firstPsychoVal})`;
    }
  }

  // Generate benchmark data
  const specificity = Math.min(totalRules / 10, 1);
  const baseBenchMid = 4 + specificity * 12 + Math.random() * 4;
  const benchSpread = 2 + Math.random() * 3;
  const benchmarkConvMid = Math.round(baseBenchMid * 10) / 10;
  const benchmarkConvLow = Math.round(Math.max(0.5, baseBenchMid - benchSpread) * 10) / 10;
  const benchmarkConvHigh = Math.round(Math.min(30, baseBenchMid + benchSpread) * 10) / 10;

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
  const titleCount = Math.max(3, Math.min(8, Math.round(3 + totalRules * 0.8 + Math.random() * 3)));
  const shuffled = [...titlePool].sort(() => Math.random() - 0.5);
  const comparableTitles = shuffled.slice(0, titleCount).map((t) => ({
    ...t,
    convRate: Math.round((baseBenchMid + (Math.random() - 0.5) * benchSpread * 2) * 10) / 10,
    similarity: Math.round(50 + Math.random() * 45),
  }));
  const confidence: "High" | "Medium" | "Low" =
    comparableTitles.length >= 5 ? "High" : comparableTitles.length >= 2 ? "Medium" : "Low";

  const predictedLow = Math.round(size * (benchmarkConvLow / 100));
  const predictedHigh = Math.round(size * (benchmarkConvHigh / 100));

  return {
    size, convRate, gamesCount, suggestedName,
    benchmarkConvLow, benchmarkConvMid, benchmarkConvHigh,
    comparableTitles, confidence,
    predictedLow, predictedHigh,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    // Only use Claude AI for V5; all other versions get heuristic analysis
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const clientVersion = (body as unknown as Record<string, unknown>).version as string | undefined;
    if (clientVersion === "v5" && apiKey && apiKey.trim().length > 0) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });

        const prompt = `You are a gaming audience intelligence analyst. Given a game project and segment definition, estimate realistic audience metrics and benchmark conversion rates.

Project: ${JSON.stringify(body.projectContext)}
Segment: ${JSON.stringify(body.segment)}

Note: Values containing "||" represent multiple OR selections (e.g., "RPG||Action" means "RPG OR Action"). Multiple values in a single rule widen the audience.

Return ONLY valid JSON with these fields:
{
  "size": <estimated addressable market, number 500-820000>,
  "convRate": <conversion rate %, number 1-20, one decimal>,
  "gamesCount": <games matching the behavioral query, number 5-300>,
  "suggestedName": <concise descriptive name, string max 40 chars>,
  "benchmarkConvLow": <25th percentile benchmark conv rate, number 0.5-15>,
  "benchmarkConvHigh": <75th percentile benchmark conv rate, number 5-30>,
  "benchmarkConvMid": <median benchmark conv rate, number 2-20>,
  "confidence": "High" | "Medium" | "Low",
  "comparableTitles": [
    {"title": "<real game title>", "genre": "<genre>", "year": <number>, "convRate": <number>, "similarity": <0-100>}
  ]
}

Confidence: High if 5+ comparable titles, Medium if 2-4, Low if 0-1.
comparableTitles: 3-6 real game titles comparable to the current project.
Consider: lifecycle stage affects market size, more rules = narrower audience, OR connectors and multi-values widen results, platform count affects reach.`;

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const firstBlock = message.content?.[0];
        const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          const size = typeof result.size === "number" && !isNaN(result.size) ? result.size : 50000;
          const convRate = typeof result.convRate === "number" && !isNaN(result.convRate) ? result.convRate : 5;
          const gamesCount = typeof result.gamesCount === "number" && !isNaN(result.gamesCount) ? result.gamesCount : 50;
          const benchmarkConvMid = typeof result.benchmarkConvMid === "number" ? result.benchmarkConvMid : convRate;
          const benchmarkConvLow = typeof result.benchmarkConvLow === "number" ? result.benchmarkConvLow : Math.max(0.5, benchmarkConvMid - 3);
          const benchmarkConvHigh = typeof result.benchmarkConvHigh === "number" ? result.benchmarkConvHigh : Math.min(30, benchmarkConvMid + 3);
          const clampedSize = Math.max(500, Math.min(820_000, Math.round(size)));
          return NextResponse.json({
            source: "claude" as const,
            size: clampedSize,
            convRate: Math.round(convRate * 10) / 10,
            gamesCount: Math.round(gamesCount),
            suggestedName: (typeof result.suggestedName === "string" && result.suggestedName) || body.segment.name,
            benchmarkConvLow: Math.round(benchmarkConvLow * 10) / 10,
            benchmarkConvMid: Math.round(benchmarkConvMid * 10) / 10,
            benchmarkConvHigh: Math.round(benchmarkConvHigh * 10) / 10,
            confidence: (["High", "Medium", "Low"].includes(result.confidence) ? result.confidence : "Medium") as "High" | "Medium" | "Low",
            comparableTitles: Array.isArray(result.comparableTitles) ? result.comparableTitles.slice(0, 8) : [],
            predictedLow: Math.round(clampedSize * (benchmarkConvLow / 100)),
            predictedHigh: Math.round(clampedSize * (benchmarkConvHigh / 100)),
          });
        }
      } catch {
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
    const result = heuristicEstimate(body);
    return NextResponse.json({ source: "heuristic" as const, ...result });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
