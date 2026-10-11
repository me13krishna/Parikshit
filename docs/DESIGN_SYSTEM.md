# Parikshit Design System: Logo-Driven Cockpit Architecture

This document defines the visual foundation, interaction patterns, design tokens, and wireframes for **Parikshit**, an AI engineering teammate that moves developers from unfamiliar code to verified changes through five deliberate stages: **Understand → Change → Challenge → Verify → Prove**.

---

## 1. Brand Essence & Token System

### 1.1 Brand Origin
The visual system is derived directly from the Parikshit identity mark:
- **Glossy Ribbon "P"**: Electric blue (`blue-500`) folding into a code document (`</>` on page). Symbolizes code deeply understood and structurally transformed.
- **Orbit Ring & Orbs**: Continuous celestial ring transitioning from teal to violet with three glowing celestial orbs. Represents the five-phase verification lifecycle.
- **Geometric Wordmark**: Wide, slightly angular letterforms with an electric cyan accent on the letter 'A'.
- **Deep Navy Cosmos**: Near-black ink background (`ink-950`) with subtle corner indigo glows (`glow-indigo`).

---

### 1.2 Color Palette (Sampled & Refined)

| Token | Sampled / Derived | Hex Value | Primary Usage |
|---|---|---|---|
| `ink-950` | Sampled | `#00030F` | Page background, root canvas |
| `ink-900` | Derived | `#060B1E` | Main container surfaces, rail background |
| `ink-800` | Derived | `#0D1430` | Raised cards, input backgrounds, active hover states |
| `glow-indigo` | Sampled | `#140756` | Ambient corner background glows, subtle card depth |
| `blue-500` | Sampled | `#076CD3` | Primary brand action, Ribbon body, Builder Agent lane |
| `indigo-500` | Sampled | `#2E38DE` | Active selection, deep brand accent |
| `sky-400` | Sampled | `#39AAF0` | Interactive links, orbs, inline highlights, info notices |
| `cyan-300` | Sampled | `#6AD7FA` | Focus rings (2px offset), Reviewer lane, data highlights |
| `teal-400` | Sampled | `#2DD4C0` | Orbit ring start, grounded badge, positive accents |
| `violet-400` | Sampled | `#9390FB` | Orbit secondary accent, Adversary Agent lane |
| `lavender-300` | Sampled | `#AD81DB` | Orbit ring termination accent |
| `text-100` | Sampled | `#E8F4FA` | Primary headings, prominent body copy |
| `text-300` | Derived | `#9FB0CC` | Secondary labels, descriptions, metadata |
| `text-500` | Derived | `#6B7A99` | Muted captions, timestamps, inactive borders |

#### Brand Gradients (CSS Variables)
- `--grad-ring`: `linear-gradient(135deg, #2DD4C0 0%, #076CD3 40%, #9390FB 75%, #AD81DB 100%)`
- `--grad-ribbon`: `linear-gradient(135deg, #6AD7FA 0%, #076CD3 55%, #2E38DE 100%)`
- `--grad-surface`: `linear-gradient(180deg, rgba(13, 20, 48, 0.7) 0%, rgba(6, 11, 30, 0.9) 100%)`

#### Semantic Colors (Dual-Encoded with Icons & Text)
- **Success**: `#34D399` (Emerald 400) + `CheckCircle` icon + "Verified / Passed" label
- **Warning**: `#FBBF24` (Amber 400) + `AlertTriangle` icon + "Warning / Ungrounded" label
- **Danger**: `#FB7185` (Rose 400) + `ShieldAlert` / `XCircle` icon + "Broken / Failed" label
- **Info**: `#39AAF0` (Sky 400) + `Info` icon + "Notice / Telemetry" label

#### Multi-Agent Battle Lanes
- **Builder Agent**: `#076CD3` (`blue-500`)
- **Adversary Agent**: `#9390FB` (`violet-400`)
- **Reviewer Agent**: `#6AD7FA` (`cyan-300`)

---

### 1.3 Typography Scale

- **Display Face**: `Sora` (Geometric, angular, wide posture echoing the wordmark). Used exclusively for page titles, hero milestones, and key metrics.
- **Body Face**: `Instrument Sans` (Clean, humanist, highly legible sans). Sentence case throughout; no all-caps labels.
- **Monospace Face**: `JetBrains Mono` (Ligatures, tabular figures). Exclusively for code, diffs, hashes, citations, and terminal output.

| Role | Family | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `display-lg` | Sora | 28px (1.75rem) | 600 SemiBold | 1.2 | Hero title, Overview headline |
| `display-md` | Sora | 20px (1.25rem) | 600 SemiBold | 1.3 | Stage headings, modal titles |
| `heading-sm` | Sora | 15px (0.9375rem) | 600 SemiBold | 1.4 | Card headers, section dividers |
| `body-base` | Instrument Sans | 14px (0.875rem) | 400 Regular / 500 Medium | 1.5 | Primary explanations, chat text |
| `body-sm` | Instrument Sans | 12px (0.75rem) | 400 Regular / 500 Medium | 1.4 | Secondary text, descriptions |
| `caption` | Instrument Sans | 11px (0.6875rem) | 400 Regular | 1.3 | Metadata, status descriptions |
| `code-sm` | JetBrains Mono | 12px (0.75rem) | 400 Regular / 500 Medium | 1.5 | Code snippets, diff lines, paths |
| `code-xs` | JetBrains Mono | 11px (0.6875rem) | 400 Regular | 1.4 | Hashes, timestamps, commit SHAs |

*Rule*: Body line length is capped at 75-80 characters for optimal scanability.

---

### 1.4 Spacing & Radii Hierarchy

- **Base unit**: 4px
- **Spacing Scale**: `4px` (space-1), `8px` (space-2), `12px` (space-3), `16px` (space-4), `20px` (space-5), `24px` (space-6), `32px` (space-8), `48px` (space-12), `64px` (space-16).
- **Radius Hierarchy**:
  - `radius-sm` (4px): Status badges, citation chips, hash tags, inline tokens.
  - `radius-md` (8px): Inputs, buttons, segmented controls, dropdown items.
  - `radius-lg` (12px): Standard content panels, chat bubbles, diff viewer container.
  - `radius-xl` (16px): Hero cards, modal dialogs, overview command cards.

---

### 1.5 Elevation & Focus Tokens

- **Border**: `1px solid rgba(159, 176, 204, 0.12)` (subtle text-300 stroke).
- **Active Border Accent**: `1px top border` with `--grad-ring` gradient on active tab or panel.
- **Focus Ring**: `2px solid #6AD7FA` with `2px offset` (`#00030F`). High contrast and unambiguous for keyboard navigation.
- **Shadows**:
  - `shadow-low`: `0 2px 8px rgba(0, 3, 15, 0.5)`
  - `shadow-mid`: `0 8px 24px -4px rgba(0, 3, 15, 0.7)`
  - `shadow-high`: `0 16px 48px -8px rgba(0, 3, 15, 0.9)`
  - `glow-ambient`: `0 0 40px -10px rgba(20, 7, 86, 0.6)`

---

### 1.6 Motion & Transition Rules

- **Duration**: 150ms to 250ms max.
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out response).
- **Purpose-Driven Motion**:
  - Pipeline Orbit lights up its stage nodes progressively as stages finish.
  - Ledger blocks flash subtle border illumination when newly appended.
  - Citation drawer slides smoothly from the right (200ms).
- **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, transitions are instant (`duration: 0ms`) and glowing pulses become static solid badges.

---

## 2. Layout Concepts & ASCII Wireframes

### 2.1 One-Sentence Screen Concepts

- **App Shell**: Persistent left rail housing brand mark, project selector, and verb-based five-stage navigation, paired with a telemetry top bar featuring the compact Pipeline Orbit, mode badges, and Ctrl+K command palette.
- **Overview (Hero)**: First-run onboarding cockpit with an interactive Pipeline Orbit visual, 1-click demo repository loader, and real-time status summary.
- **Understand (Mentor)**: Dual-pane architectural grounding workspace pairing interactive AST-verified conversation with a dedicated snippet inspection drawer.
- **Change (Vibe Builder & Gate)**: Plan-first code generation studio featuring step-by-step implementation tasks, syntax-highlighted unified diffs, and an uncompromised Human Approval Gate.
- **Challenge (AI vs AI Battle)**: Structured three-column arena pitting Builder against Adversary with multi-round stress tests and Reviewer risk syntheses.
- **Verify (Checks, Self-Heal, Digital Twin)**: Comprehensive testing dashboard combining sandboxed execution telemetry, autonomous self-healing loops, and AST dependency blast-radius simulation.
- **Prove (Proof-of-Work Ledger)**: Cryptographically verified SHA-256 block chain timeline with instant tampering detection and one-click evidence pack download.

---

### 2.2 ASCII Wireframes

#### App Shell
```
+----------------------------------------------------------------------------------------------------+
| [Mark + PARIKSHIT]  | Project: [Demo Calculator v] | [O--O--O--O--O Orbit] | [Mock] [Docker] [Chain OK] (K)|
+---------------------+------------------------------------------------------------------------------+
| [Overview]          | BREADCRUMB: Overview > Ingest Repository                                     |
|                     | [Banner: Mock Mode active (deterministic evaluation, 0 external API cost)]   |
| STAGES:             +------------------------------------------------------------------------------+
| 1. Understand       |                                                                              |
|    Codebase Mentor  |                                                                              |
| 2. Change           |                         MAIN VIEWPORT CONTENT                                |
|    Vibe Builder     |                                                                              |
| 3. Challenge        |                                                                              |
|    AI-vs-AI Battle  |                                                                              |
| 4. Verify           |                                                                              |
|    Checks & Heal    |                                                                              |
| 5. Prove            |                                                                              |
|    Crypt Ledger     |                                                                              |
|                     |                                                                              |
| [Collapse Rail <]   |                                                                              |
+---------------------+------------------------------------------------------------------------------+
```

#### Overview (Interactive Onboarding & Pipeline Orbit)
```
+----------------------------------------------------------------------------------------------------+
|  PARIKSHIT: Grounded AI Engineering Teammate                                                       |
|  "Understand. Change. Challenge. Verify. Prove."                                                   |
|                                                                                                    |
|            (1: Understand) -------- (2: Change)                                                    |
|                 /                          \                                                       |
|        (Start)                             (3: Challenge)                                          |
|                 \                          /                                                       |
|            (5: Prove)    <--------- (4: Verify)                                                    |
|                                                                                                    |
|  Current Project: Calculator Service [Active Revision: rev_a81f3b]                                 |
+----------------------------------------------------------------------------------------------------+
| [ Load Demo Calculator Project ]   OR   [ Ingest New Repository (Git / Local / ZIP) ]             |
+----------------------------------------------------------------------------------------------------+
| QUICK METRICS:                                                                                     |
| [ 14 Ingested Files ]  |  [ 1 Approved Patch ]  |  [ 2 Battle Rounds ]  |  [ 10 Ledger Blocks OK ] |
+----------------------------------------------------------------------------------------------------+
```

#### Understand (Grounded Mentor & Citations)
```
+-----------------------------------------------------------------------+----------------------------+
| Grounded Mentor: Calculator Service                                    | Active Citation Drawer     |
+-----------------------------------------------------------------------+----------------------------+
| [System]: Grounded in AST index. Every answer links to file lines.    | File: calculator.py        |
|                                                                       | Lines: 24 - 42             |
| [User]: Where is division by zero handled?                             | Status: [Verified Ground] |
|                                                                       | Hash: sha256_8f3a91b...    |
| [Mentor]: Division by zero is checked in `Calculator.divide()` before | +------------------------+ |
| execution, raising `ZeroDivisionError` with a structured message.     | | 24: def divide(a, b):  | |
|                                                                       | | 25:   if b == 0:       | |
| Citations: [calculator.py:24-42 ✓]  [tests/test_calc.py:15-30 ✓]      | | 26:     raise ZeroDiv..| |
|                                                                       | +------------------------+ |
| [ Quick Prompts: "Core duties?" | "Test layout?" | "Error contracts?" ]| [ Copy Snippet ] [ Close ] |
+-----------------------------------------------------------------------+                            |
| [ Ask question about architecture, invariants, or methods... ] [Ask]  |                            |
+-----------------------------------------------------------------------+----------------------------+
```

#### Change (Vibe Builder & Human Approval Gate)
```
+----------------------------------------------------------------------------------------------------+
| Task Formulation: [ Implement robust multiply operation and unit tests              ] [Plan Task] |
+----------------------------------------------------------------------------------------------------+
| Task #tsk_901: Implementation Plan                                                                 |
| 1. Add `multiply(a, b)` method in `calculator.py` with type annotations                            |
| 2. Add parameterized test cases in `tests/test_calculator.py`                                      |
| Actions: [ Build in Sandbox ] [ Run Pytest ]                                                       |
+----------------------------------------------------------------------------------------------------+
| UNIFIED PATCH DIFF: (2 files modified)                                                             |
| +++ calculator.py                                                                                  |
| @@ -18,6 +18,12 @@                                                                                 |
| + def multiply(a: float, b: float) -> float:                                                       |
| +     """Compute the product of two numbers."""                                                    |
| +     return a * b                                                                                 |
+----------------------------------------------------------------------------------------------------+
| HUMAN APPROVAL GATE:  Status: [ PENDING APPROVAL ]                                                 |
| Human review required before code export to source files.                                          |
| [ ✓ Approve Patch ]       [ ✕ Reject Patch ]       [ ⬇ Apply & Export to Source (Locked) ]          |
+----------------------------------------------------------------------------------------------------+
```

#### Challenge (AI vs AI Battle Arena)
```
+----------------------------------------------------------------------------------------------------+
| AI vs AI Battle Arena                                                     Rounds: [ 2 Rounds v ]   |
| Builder writes fixes -> Adversary stress-tests -> Reviewer evaluates      [ Start Battle ]         |
+----------------------------------------------------------------------------------------------------+
| VERDICT: [ APPROVED - PATCH RESILIENT ]               Residual Risks: [ 0 High, 1 Low ]            |
+----------------------------------------------------------------------------------------------------+
| ROUND #1: Sandbox Exit Code 0 (Passed)                                                             |
| +------------------------------------+------------------------------------+                        |
| | ADVERSARY ATTACK VECTOR [High]     | REVIEWER SYNTHESIS                 |                        |
| | "Float Overflow on Large Exponents"| "Adversary attempted extreme IEEE  |                        |
| | Proposed test: test_overflow.py    | 754 limits. Handled cleanly."      |                        |
| +------------------------------------+------------------------------------+                        |
| ROUND #2: Sandbox Exit Code 0 (Passed)                                                             |
| +------------------------------------+------------------------------------+                        |
| | ADVERSARY ATTACK VECTOR [Medium]   | REVIEWER SYNTHESIS                 |                        |
| | "String Input Injection"           | "Type validator caught strings.    |                        |
| | Proposed test: test_bad_types.py   | Residual risk: document types."    |                        |
| +------------------------------------+------------------------------------+                        |
+----------------------------------------------------------------------------------------------------+
```

#### Verify (Sandbox Execution, Self-Heal, Digital Twin)
```
+----------------------------------------------------------------------------------------------------+
| TAB: [ Sandbox Checks & Self-Heal ]  |  [ Digital Twin Impact Simulator ]                          |
+----------------------------------------------------------------------------------------------------+
| RUN: run_pytest_4091 | Exit Code: 1 (FAILED)                              [ Trigger Self-Heal Loop ]|
| $ pytest -q tests/test_calculator.py                                                               |
| FAILED tests/test_calculator.py::test_multiply - AssertionError: expected 42 got 0                 |
|                                                                                                    |
| SELF-HEAL PROGRESS: [ ITERATION 1/2 ] -> Re-synthesizing patch -> Tests passing (Exit Code 0)      |
+----------------------------------------------------------------------------------------------------+
| DIGITAL TWIN DEPENDENCY BLAST RADIUS: Target: `calculator.py`                                      |
| Blast Radius Score: 18 | Risk Level: [ LOW RISK ]                                                  |
| Downstream Dependents:                                                                             |
| - `tests/test_calculator.py` (Direct consumer)                                                     |
| - `app/api/endpoints.py` (Route handler)                                                           |
+----------------------------------------------------------------------------------------------------+
```

#### Prove (Proof-of-Work Ledger)
```
+----------------------------------------------------------------------------------------------------+
| Proof-of-Work Cryptographic Ledger                          [ Verify Integrity ] [ Evidence Pack ] |
+----------------------------------------------------------------------------------------------------+
| STATUS: [ ✓ Cryptographic Chain Verified: Intact ] (12 total blocks chained with SHA-256)          |
+----------------------------------------------------------------------------------------------------+
|  #1  [project_ingested]  hash: a55fdcce... -> prev: 00000000...      20:36:27                      |
|  |   (Payload: repository cloned from demo calculator app)                                         |
|  |                                                                                                 |
|  #2  [task_created]      hash: 82ab91fe... -> prev: a55fdcce...      20:37:12                      |
|  |   (Payload: task tsk_901 created with request plan)                                             |
|  |                                                                                                 |
|  #3  [sandbox_run]       hash: f3910acd... -> prev: 82ab91fe...      20:38:04                      |
|  |   (Payload: pytest executed, exit code 0)                                                       |
|  |                                                                                                 |
|  #4  [battle_completed]  hash: 104b92ec... -> prev: f3910acd...      20:39:15                      |
|      (Payload: 2 battle rounds verified, verdict approved)                                         |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Principles Specific to Parikshit

1. **Spend Boldness in One Place**:
   The **Pipeline Orbit** is the singular luminous centerpiece. All surrounding surfaces remain calm, dense, well-aligned dark-navy surfaces.
2. **Grounding Over Hallucination**:
   Never present assertions without provenance. Every claim must render an interactive, verifiable citation chip with path and exact line numbers.
3. **Dual-Channel Encoding**:
   Never rely solely on color to communicate state. Always pair color with an explicit semantic icon and text label (e.g. green + shield-check + "Chain Verified").
4. **Human Gate is Inviolable**:
   Autonomous AI builders must never commit or export patches silently. Human approval is an explicit, prominent milestone.
5. **Cryptographic Proof as Default**:
   Every state transformation (ingest, patch, execution, battle) is anchored into an immutable, verifiable ledger.

---

## 4. Review Against Generic-AI-Design Traps & Revisions

| Generic AI Trap | Original Pattern or Risk | Our Explicit Revision | Rationale |
|---|---|---|---|
| **Near-black background with a single neon accent everywhere** | Flat `#000000` canvas with blinding `#00FFCC` buttons, borders, and text everywhere. | Multi-tiered navy palette (`ink-950`, `ink-900`, `ink-800`), dedicated role colors (Builder `blue-500`, Adversary `violet-400`, Reviewer `cyan-300`). | Provides visual hierarchy and readability without neon eye strain. |
| **Identical rounded cards with the same soft shadow around everything** | Nested identical cards with `rounded-2xl shadow-lg` causing visual mud. | Strict radius hierarchy: chips (4px), inputs/buttons (8px), content panels (12px), hero only (16px). Shadows removed from flat cards; 1px subtle borders used instead. | Eliminates visual clutter; creates distinct functional tiers. |
| **Gradient washes used as pure decoration** | Irrelevant background gradients, purple clouds, and glowing blobs that distract from code. | Eliminated all decorative background blobs. Gradients restricted to the Orbit ring, ribbon logo, and 1px active indicator lines. | Keeps the workspace serious, professional, and code-focused. |
| **ALL-CAPS tracked eyebrow, middle-dot strings, monospace everywhere, arrow on every button** | `METRICS • LIVE`, `->` on every button, uppercase text everywhere. | Sentence case across all UI copy. Clean verb labels on buttons without trailing arrows. Monospace strictly reserved for code, diffs, hashes, and line numbers. | Maximizes legibility and avoids generic mock-futuristic cliché. |
| **Fade-and-slide-up entrance on every section and hover effects on every card** | Distracting bouncy animations and cards lifting on hover. | Instant or 150ms state transitions. Motion exclusively used for purposeful feedback (Orbit node completion, drawer opening). `prefers-reduced-motion` honored. | Feels fast, snappy, and respectful of developer focus. |
| **Numbered 01/02/03 markers on content that is not actually a sequence** | Numbering random feature lists or independent metric cards. | Sequential numbering strictly reserved for the true sequential lifecycle: the 5 pipeline stages and battle rounds. | Preserves the semantic meaning of numbers for actual workflows. |
