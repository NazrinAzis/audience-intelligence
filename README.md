# Audience Intelligence

A prototype platform for game publishers and marketers to **build player segments, profile who those players are, and estimate how a game will land with them**. It goes from "who should we target?" to a go-to-market view in one flow.

> This is a product prototype that runs on generated mock data. It is not connected to any production data source.

## What it does

- **Segment builder**: define player segments with behavioral rules (genres played, engagement, spend) in a query-builder UI.
- **AI-assisted segmentation**: describe your ideal player in plain language and Claude turns it into segment rules.
- **Segment profile**: demographics, device ownership, regional distribution and psychographic personas for each segment.
- **Audience view**: compare titles, find the addressable market by region, and estimate launch adopters and conversion from similar segments.
- **Performance tracking**: follow a title after launch and check its trajectory against benchmarks.
- **Tiered versions**: a version switcher shows how features unlock across product tiers.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- [Recharts](https://recharts.org) for charts
- [Zustand](https://github.com/pmndrs/zustand) for state
- [Anthropic Claude API](https://docs.claude.com) for the AI features (`src/app/api/*`)
- Deployed on [Railway](https://railway.app)

## Getting started

```bash
npm install
# create .env.local with the variables below
npm run dev
```

Then open http://localhost:3000.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Powers AI segment building, profile generation and chat |

### Regenerating mock data

```bash
npx tsx scripts/generateMockData.ts
```

## Project structure

```
src/app/dashboard        Segment list and product tiers
src/app/projects/[id]    Segment, profile, audience and performance pages
src/app/api              AI endpoints (segments, profiles, chat, benchmarks)
src/lib                  Mock data, taxonomy and helpers
design-reference         Static HTML design references
```

## Author

Built by [Nazrin Qayyum Azis](https://www.linkedin.com/in/nazrinqayyum), a product manager in Amsterdam.
