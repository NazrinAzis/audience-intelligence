import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an audience segmentation expert for a gaming market intelligence platform. The user will describe an audience in natural language. Your job is to translate that into structured segment filters. The available dimensions are: What They Play (genre, sub-genre, platform, play frequency, session length, hours played), Who They Are (age range, gender, country/region, household income), Why They Play (primary motivation from: competition, story, exploration, social, relaxation, achievement), What They Pay (spending tier: free, low, medium, high, whale). Return a JSON object with keys: whatTheyPlay, whoTheyAre, whyTheyPlay, whatTheyPay — each containing the relevant filter values to apply. Also include a "suggestedName" field with a short, descriptive segment name. Only include dimensions with confident matches. Be specific.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, version } = await req.json();

    // AI segment building is V5-only
    if (version !== "v5") {
      return NextResponse.json({ error: "AI segment building requires V5" }, { status: 403 });
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[1]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI segment error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
