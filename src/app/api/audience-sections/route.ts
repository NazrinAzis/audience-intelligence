import { NextRequest, NextResponse } from "next/server";

interface SegmentInput {
  name: string;
  tier: string;
  color: string;
  addressableMarket: number;
  conversionRate: number;
  benchmarkConvLow?: number;
  benchmarkConvMid?: number;
  benchmarkConvHigh?: number;
  priorityScore?: number;
}

interface RequestBody {
  projectTitle: string;
  lifecycle: string;
  platforms: string[];
  totalTrackedUsers: number;
  generalPopConversionRate: number;
  totalAdopters: number;
  segments: SegmentInput[];
  /** Which sections to generate */
  sections: ("overlap" | "insights" | "affinity")[];
}

// ─── Overlap Matrix Generation ───

interface OverlapRow {
  label: string;
  segmentsQualified: number;
  userCount: number;
  adopters: number;
  conversionRate: number;
}

function generateOverlapMatrix(
  segments: SegmentInput[],
  totalTrackedUsers: number,
  generalPopConvRate: number,
  isPreLaunch: boolean,
): OverlapRow[] {
  const segCount = segments.length;
  const totalAddressable = segments.reduce((s, seg) => s + seg.addressableMarket, 0);

  // Distribute users across overlap tiers
  const noSegUsers = Math.max(0, totalTrackedUsers - Math.round(totalAddressable * 1.1));
  const remaining = totalTrackedUsers - noSegUsers;

  // Proportions: ~65% single, ~25% double, ~10% all
  const singlePct = segCount <= 1 ? 1.0 : 0.65;
  const doublePct = segCount <= 1 ? 0 : segCount === 2 ? 0.25 : 0.25;
  const allPct = segCount <= 2 ? (segCount === 2 ? 0.10 : 0) : 0.10;

  const singleUsers = Math.round(remaining * singlePct);
  const doubleUsers = segCount >= 2 ? Math.round(remaining * doublePct) : 0;
  const allUsers = segCount >= 2 ? Math.round(remaining * allPct) : 0;

  // Conv rate multipliers relative to general pop
  const noSegConv = Math.round(generalPopConvRate * 100) / 100;
  const singleConv = Math.round(generalPopConvRate * 8 * 100) / 100;
  const doubleConv = Math.round(generalPopConvRate * 20 * 100) / 100;
  const allConv = Math.round(generalPopConvRate * 40 * 100) / 100;

  const rows: OverlapRow[] = [
    {
      label: "No Segment",
      segmentsQualified: 0,
      userCount: noSegUsers,
      adopters: Math.round(noSegUsers * (noSegConv / 100)),
      conversionRate: noSegConv,
    },
    {
      label: "1 Segment",
      segmentsQualified: 1,
      userCount: singleUsers,
      adopters: isPreLaunch
        ? Math.round(singleUsers * (singleConv / 100))
        : Math.round(singleUsers * (singleConv / 100)),
      conversionRate: singleConv,
    },
  ];

  if (segCount >= 2) {
    rows.push({
      label: "2 Segments",
      segmentsQualified: 2,
      userCount: doubleUsers,
      adopters: Math.round(doubleUsers * (doubleConv / 100)),
      conversionRate: doubleConv,
    });
  }

  if (segCount >= 2) {
    rows.push({
      label: `All ${segCount} Segments`,
      segmentsQualified: segCount,
      userCount: allUsers,
      adopters: Math.round(allUsers * (allConv / 100)),
      conversionRate: allConv,
    });
  }

  return rows;
}

// ─── Strategic Insights (heuristic) ───

interface InsightCard {
  segmentName: string;
  tier: string;
  color: string;
  headline: string;
  body: string;
}

function generateHeuristicInsights(
  segments: SegmentInput[],
  lifecycle: string,
  overlapRows: OverlapRow[],
): InsightCard[] {
  const isPreLaunch = lifecycle.toLowerCase().includes("pre") ||
    lifecycle.toLowerCase().includes("greenlight") ||
    lifecycle.toLowerCase().includes("concept");

  const cards: InsightCard[] = segments.map((seg, i) => {
    const tier = seg.tier || ["Core", "Secondary", "Tertiary", "Quaternary"][Math.min(i, 3)];
    const tierLabel = tier.toUpperCase() + " SEGMENT";
    const conv = seg.benchmarkConvMid || seg.conversionRate || 0;
    const adopters = Math.round(seg.addressableMarket * (conv / 100));

    let headline: string;
    let body: string;

    if (i === 0) {
      headline = isPreLaunch
        ? "Prioritize This Segment in Pre-Launch Planning"
        : "Allocate UA Budget Here First";
      body = isPreLaunch
        ? `${formatNum(seg.addressableMarket)} players predicted to convert at ${conv}% \u2014 your highest-efficiency cohort. Prioritize this segment in pre-launch campaign planning and ensure creative assets resonate with this audience.`
        : `${formatNum(adopters)} players converting at ${conv}% \u2014 your highest-efficiency cohort. Every dollar spent here returns significantly more adopters than other segments. Cap spend only when this pool is saturated.`;
    } else if (i === 1) {
      headline = isPreLaunch
        ? "Build Awareness With This Audience Early"
        : "Scale When Core Is Saturated";
      body = isPreLaunch
        ? `${formatNum(seg.addressableMarket)} addressable at ${conv}% predicted conversion \u2014 large enough to drive volume. Begin building awareness with this audience during pre-launch to maximize Day 1 conversions.`
        : `${formatNum(seg.addressableMarket)} addressable at ${conv}% \u2014 large enough to drive volume, efficient enough to be profitable. Activate after Core campaigns show diminishing returns.`;
    } else {
      headline = isPreLaunch
        ? `${tier}: Monitor and Validate Post-Launch`
        : `${tier}: Awareness Only`;
      body = isPreLaunch
        ? `${formatNum(seg.addressableMarket)} addressable but only ${conv}% predicted conversion. Include in broad awareness campaigns but defer direct response spend. Validate actual conversion post-launch before increasing budget.`
        : `${formatNum(seg.addressableMarket)} addressable but only ${conv}% conversion. Use for broad awareness and top-of-funnel only \u2014 direct response spend here will underperform. Monitor whether conversion improves before increasing budget.`;
    }

    return { segmentName: seg.name, tier: tierLabel, color: seg.color, headline, body };
  });

  // All-segments overlap card
  if (segments.length >= 2) {
    const allRow = overlapRows[overlapRows.length - 1];
    const genPop = overlapRows[0]?.conversionRate || 0.24;
    const multiplier = genPop > 0 ? Math.round(allRow.conversionRate / genPop) : 40;

    cards.push({
      segmentName: `${segments.length}-Segment Overlap`,
      tier: `${segments.length}-SEGMENT OVERLAP`,
      color: "#805AD5",
      headline: isPreLaunch
        ? "High-Intent Retargeting Opportunity at Launch"
        : "Retarget This List Before Next Campaign",
      body: isPreLaunch
        ? `${formatNum(allRow.userCount)} players qualifying all ${segments.length} segments are predicted to convert at ${allRow.conversionRate}% \u2014 ${multiplier}x the general population. Build a dedicated retargeting list from this cohort and activate it in the final 2 weeks before launch.`
        : `${formatNum(allRow.userCount)} players qualifying all ${segments.length} segments convert at ${allRow.conversionRate}% \u2014 ${multiplier}x the general population. Build a dedicated retargeting list from this cohort for your next campaign wave.`,
    });
  }

  return cards;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return n.toLocaleString();
}

// ─── Game Affinity (heuristic) ───

interface AffinityRow {
  title: string;
  affinities: number[]; // one per segment, as %
}

function generateHeuristicAffinity(segments: SegmentInput[]): AffinityRow[] {
  const GAME_POOL = [
    "Elden Ring", "The Witcher 3: Wild Hunt", "Baldur's Gate 3",
    "Red Dead Redemption 2", "God of War Ragnarok", "Cyberpunk 2077",
    "Hogwarts Legacy", "Starfield", "Civilization VI",
    "Total War: Warhammer III", "Stardew Valley", "Minecraft",
    "Hades", "Disco Elysium", "Divinity: Original Sin 2",
  ];

  // Pick 10 games
  const titles = GAME_POOL.slice(0, Math.min(10, GAME_POOL.length));

  return titles.map((title, ti) => {
    const affinities = segments.map((_seg, si) => {
      // Deterministic pseudo-random based on title+segment index
      const h = simpleHash(`${title}-${si}-${ti}`);
      // Range 8-82%, with first segment generally higher
      const base = si === 0 ? 35 : si === 1 ? 25 : 18;
      return Math.min(95, Math.max(5, base + Math.round(h * 55)));
    });
    return { title, affinities };
  });
}

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

// ─── Claude-enhanced generation ───

async function generateWithClaude(body: RequestBody, overlapRows: OverlapRow[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return null;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const segSummary = body.segments.map((s) =>
      `${s.name} (${s.tier}): ${s.addressableMarket} addressable, ${s.conversionRate}% conv, benchmark ${s.benchmarkConvMid ?? "N/A"}%`
    ).join("\n");

    const prompt = `You are a gaming audience intelligence analyst. Given this project and segments, generate strategic insights and game affinity data.

Project: "${body.projectTitle}" (${body.lifecycle})
Platforms: ${body.platforms.join(", ")}
Total Tracked: ${body.totalTrackedUsers}, General Pop Conv: ${body.generalPopConversionRate}%

Segments:
${segSummary}

Overlap Matrix:
${overlapRows.map((r) => `${r.label}: ${r.userCount} users, ${r.conversionRate}% conv`).join("\n")}

Return ONLY valid JSON:
{
  "insights": [
    {
      "segmentName": "<segment name or 'N-Segment Overlap'>",
      "tier": "<TIER LABEL>",
      "color": "<hex color>",
      "headline": "<bold actionable headline, max 8 words>",
      "body": "<2-3 sentences with specific numbers from the data>"
    }
  ],
  "affinity": [
    {
      "title": "<real game title>",
      "affinities": [<% for seg1>, <% for seg2>, ...]
    }
  ]
}

Rules:
- One insight per segment + one for the all-segments overlap cohort
- First segment: focus on highest efficiency, allocate budget here
- Last overlap card: reference the ${overlapRows[overlapRows.length - 1]?.conversionRate}% conv and multiplier vs general pop
- Affinity: 10 real game titles relevant to segment definitions
- Affinity %: 5-95, higher for games matching segment themes
- ${body.lifecycle.includes("Pre") || body.lifecycle.includes("Concept") ? "Frame insights as forward-looking predictions" : "Frame insights around current performance"}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const firstBlock = message.content?.[0];
    const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through to heuristic
  }
  return null;
}

// ─── POST Handler ───

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { segments, totalTrackedUsers, generalPopConversionRate, lifecycle } = body;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "No segments provided" }, { status: 400 });
    }

    const isPreLaunch = lifecycle.toLowerCase().includes("pre") ||
      lifecycle.toLowerCase().includes("greenlight") ||
      lifecycle.toLowerCase().includes("concept");

    // 1. Overlap matrix (always heuristic — deterministic)
    const overlap = generateOverlapMatrix(segments, totalTrackedUsers, generalPopConversionRate, isPreLaunch);

    // 2 & 3. Only use Claude for V5; all other versions get heuristic insights
    const clientVersion = (body as unknown as Record<string, unknown>).version as string | undefined;
    const claudeResult = clientVersion === "v5" ? await generateWithClaude(body, overlap) : null;

    let insights: InsightCard[];
    let affinity: AffinityRow[];

    if (claudeResult?.insights && Array.isArray(claudeResult.insights) && claudeResult.insights.length > 0) {
      insights = claudeResult.insights;
    } else {
      insights = generateHeuristicInsights(segments, lifecycle, overlap);
    }

    if (claudeResult?.affinity && Array.isArray(claudeResult.affinity) && claudeResult.affinity.length > 0) {
      affinity = claudeResult.affinity;
    } else {
      affinity = generateHeuristicAffinity(segments);
    }

    return NextResponse.json({
      overlap,
      insights,
      affinity,
      isPreLaunch,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
