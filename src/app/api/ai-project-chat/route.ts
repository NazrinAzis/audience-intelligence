import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an audience intelligence assistant helping a game publisher or marketer build player segments for analysis. Your job is to have a short, friendly clarifying conversation to understand exactly what segments to build, then propose them for confirmation.

Rules:
- Ask only ONE question at a time
- Maximum 3 clarifying questions before proposing segments
- If the user's message already contains enough info (game, number of segments, audience type), skip straight to proposing
- Always infer what you can — don't ask for things already mentioned
- After gathering enough info, output a structured segment proposal in this EXACT JSON format wrapped in <segments> tags:

<segments>
[
  {
    "name": "Segment name",
    "priority": "CORE" | "SECONDARY" | "TERTIARY",
    "description": "One sentence description of this audience",
    "rules": {
      "genres": ["genre1"],
      "platforms": ["PC"],
      "spender": true | false,
      "engagement": "casual" | "mid-core" | "hardcore"
    }
  }
]
</segments>

Before outputting the JSON, write a short friendly summary like "Here's what I'll build:" followed by a bullet list of the segments in plain English, then ask "Does this look right, or would you like to adjust anything?"

Also include project metadata in <project-meta> tags:
<project-meta>
{
  "gameTitle": "inferred game title or 'Untitled Project'",
  "lifecycle": "Concept/Pre-Greenlight" | "In Development" | "Pre-Launch" | "Launched" | "Live Service",
  "monetization": "Premium / P2P" | "Free to Play" | "Hybrid",
  "platforms": ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"]
}
</project-meta>

The first message you send should ALWAYS be: "What kind of players are you trying to find? Tell me about your game or the audience you have in mind."`;

export async function POST(req: NextRequest) {
  try {
    const { messages, version } = await req.json();

    if (version !== "v5") {
      return NextResponse.json({ error: "AI project chat requires V5" }, { status: 403 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Parse segments if present
    let segments = null;
    const segMatch = text.match(/<segments>([\s\S]*?)<\/segments>/);
    if (segMatch) {
      try { segments = JSON.parse(segMatch[1]); } catch { /* ignore */ }
    }

    // Parse project metadata if present
    let projectMeta = null;
    const metaMatch = text.match(/<project-meta>([\s\S]*?)<\/project-meta>/);
    if (metaMatch) {
      try { projectMeta = JSON.parse(metaMatch[1]); } catch { /* ignore */ }
    }

    // Strip XML tags from display text
    const displayText = text
      .replace(/<segments>[\s\S]*?<\/segments>/g, "")
      .replace(/<project-meta>[\s\S]*?<\/project-meta>/g, "")
      .trim();

    return NextResponse.json({ reply: displayText, segments, projectMeta });
  } catch (error) {
    console.error("AI project chat error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
