# Parikshit Web Cockpit

Production-grade Next.js (App Router, Turbopack, Tailwind CSS) cockpit for **Parikshit: The Grounded AI Engineering Teammate**.

## Architecture & Features

The cockpit interfaces directly with the FastAPI backend engine to visualize and control the five pillars:

1. **Grounded Mentor (Pillar 1):** Interactive architectural guidance and code query interface where every claim is strictly linked to AST verified file paths and line ranges. Clickable citation pills allow inspecting snippets and SHA-256 hashes.
2. **Vibe Builder & Human Gate (Pillar 2):** Automated task breakdown and patch generation inside isolated worktrees. Strictly gates code export until human approval is cryptographically logged.
3. **AI vs AI Battle Arena (Pillar 3):** Side-by-side visualization of the Builder, Adversary QA (boundary condition attacks), and Reviewer synthesis with severity ratings and residual risks.
4. **Proof-of-Work Hash Ledger (Pillar 4):** Real-time audit timeline showing SHA-256 hash chains for all events. Features one-click chain tamper verification and cryptographic Evidence Pack JSON downloads.
5. **Self-Healing Loop (Pillar 5):** Automated diagnose-patch-verify loop triggered upon failing test suites.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with fonts & metadata
│   │   ├── page.tsx           # Cockpit orchestrator view
│   │   └── globals.css        # Theme tokens and dark mode styling
│   ├── components/            # Modular cockpit components
│   │   ├── Banner.tsx         # Mock mode & unsandboxed host warnings
│   │   ├── Header.tsx         # Telemetry badges and ledger status
│   │   ├── Sidebar.tsx        # Pillar navigation tabs
│   │   ├── ProjectIngest.tsx  # Git, Local, and safe ZIP repo ingester
│   │   ├── MentorChat.tsx     # Grounded Q&A with AST citations
│   │   ├── CitationViewer.tsx # Grounded snippet inspect modal
│   │   ├── TaskPlanner.tsx    # Vibe builder and human gate
│   │   ├── DiffViewer.tsx     # Color-coded unified patch diff viewer
│   │   ├── SandboxResults.tsx # Test execution console & self-heal trigger
│   │   ├── BattleReport.tsx   # Multi-round arena breakdown
│   │   ├── TwinGraph.tsx      # Digital twin dependency & blast radius
│   │   └── LedgerTimeline.tsx # Tamper-evident ledger timeline
│   └── lib/
│       ├── api.ts             # Typed API client with error envelope handling
│       └── types.ts           # Shared TypeScript domain models
└── vitest.config.ts           # Vitest configuration for unit tests
```

## Running Locally

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run development server
npm run dev

# Build production bundle
npm run build
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend FastAPI base URL |
| `NEXT_PUBLIC_PARIKSHIT_API_KEY` | *(optional)* | API key passed in `X-API-Key` header |
