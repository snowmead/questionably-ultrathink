# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# First-time setup (installs lefthook, comrak, sets up git hooks)
./setup.sh

# Validate plugin structure (run by CI)
./scripts/validate-plugin.sh

# Validate frontmatter syntax (run by CI)
python3 scripts/check-frontmatter.py claude-code/**/*.md skills/**/*.md
```

Pre-commit hooks run automatically via lefthook:
- `format-markdown`: Formats non-plugin markdown with comrak
- `validate-plugin`: Runs `claude plugin validate .`

## Overview

Claude Code plugin integrating two research-backed reasoning frameworks:
- **Atom of Thoughts (AoT)** - Decomposes problems into atomic sub-questions as a DAG
- **Chain of Verification (CoVe)** - Verifies claims through factored execution (isolated verifiers with zero context)

## Directory Structure

```
questionably-ultrathink/
├── .claude-plugin/           # Root plugin manifest + marketplace.json
├── claude-code/              # Claude Code plugin source
│   ├── .claude-plugin/       # Inner plugin manifest
│   ├── .mcp.json             # Optional Parallel.ai MCP servers
│   ├── agents/               # Subagents (run on haiku model)
│   ├── commands/             # User-invocable commands (/questionably-ultrathink, /decompose, /verify)
│   └── skills/               # Orchestration skill
├── skills/                   # Root skills/ for add-skill discovery (other agents)
├── hooks/                    # Hook configuration (currently empty)
└── scripts/                  # CI validation scripts
```

## Component Architecture

**Commands** → **Skill** → **Agents**

- Commands (`/questionably-ultrathink`, `/decompose`, `/verify`) invoke the skill
- Skill (`questionably-ultrathink-skill`) orchestrates by chaining agent calls via `Task` tool
- Skill named differently from command to avoid naming collision

**Agents** (invoked with `subagent_type`):
| Agent | Purpose | Tools |
|-------|---------|-------|
| `aot-graph-generator` | Builds question DAG (no solving) | Read, Write, AskUserQuestion |
| `cove-claim-qs` | Generates claims + verification Qs + pre-creates verifier files (NO fact-checking) | Read, Write |
| `cove-verifier` | Researches ONE verification Q with zero context (reads pre-created verifier file) | Read, Write, WebSearch, WebFetch, mcp__parallel-search__* |
| `cove-verification-maintainer` | Cross-checks claims, synthesizes final answer | Read, Write, Edit |
| `aot-graph-maintainer` | Contracts solved answers INTO dependent questions | Read, Write, Bash |
| `aot-judge` | Evaluates quality across atoms (High-Stakes only) | Read |

**Key insight:** Only `cove-verifier` does actual research/fact-checking.

## Core Design: Factored Verification

The key innovation is **complete isolation** at every step:

```
Graph Generator → creates DAG only (no solving)
        ↓
Claim Generator (cove-claim-qs) → generates claims + verification Qs (NO research)
        │                        pre-creates verifiers/{N}.md with ONLY the question
        ↓
Verifiers → read pre-created file, research answer with ZERO context about claims
        │    (only agents that do fact-checking)
        ↓
Verification Maintainer → cross-checks claims vs independent answers
        │                  synthesizes final answer from verified facts
        ↓
Graph Maintainer → contracts solved answers into dependent questions
```

**Why this matters:** When a verifier answers "What is Redis per-key overhead?", it reads a pre-created file containing ONLY that question. It has no idea this is checking a claim of "90 bytes". It answers independently (finds "96 bytes"), then the maintainer detects the discrepancy and synthesizes the correct answer.

## Inter-Agent Communication

Agents communicate via files in `.questionably-ultrathink/{session-id}/`. Each atom has its own folder:

```
.questionably-ultrathink/{session-id}/
├── metadata.md              # DAG structure (immutable after creation)
└── atoms/
    ├── A1/
    │   ├── question.md      # Written by: graph-generator
    │   ├── claims.md        # Written by: cove-claim-qs
    │   ├── answer.md        # Written by: verification-maintainer
    │   └── verifiers/
    │       ├── 1.md         # Pre-created by: cove-claim-qs (question only)
    │       │                # Completed by: cove-verifier (adds answer)
    │       └── 2.md
    ├── A2/
    │   └── ...
    └── FINAL/
        └── ...
```

**State = File Existence + Content:**
- `question.md` exists → atom created (by graph-generator)
- `claims.md` exists → claims generated (by cove-claim-qs)
- `verifiers/{N}.md` exists with question only → pre-created, ready for verifier
- `verifiers/{N}.md` has "# Answer" section → verification question answered
- `answer.md` exists → verification complete (by verification-maintainer)

**No concurrent writes:** Each file written by exactly one agent (verifier files: pre-created by cove-claim-qs, then overwritten by cove-verifier).

**answer.md structure after verification (schema v2):**
```markdown
---
schema_version: 2
atom_id: A1
confidence_score: 0.85
verification_status: factored
question_text: "{the question}"
answer_text: "{final answer after incorporating verification}"
confidence_rationale:
  rule: "min(claim_confidence) with penalties for REFUTED/UNCERTAIN, weighted by impact"
  inputs: {claim_confidences: [HIGH, HIGH], statuses: [VERIFIED, REVISED], impacts: [HIGH, MEDIUM]}
  notes: "{explanation of how confidence was computed}"
claims:
  - claim_id: "A1:1"
    claim_number: 1
    claim_text: "{original claim}"
    verification_question: "{the verification question}"
    verification_answer: "{answer from verifier}"
    verifier_confidence: HIGH | MEDIUM | LOW
    status: VERIFIED | REVISED | REFUTED | UNCERTAIN
    impact: HIGH | MEDIUM | LOW
    revision_note: null | "{what changed}"
    corrected_claim_text: null | "{corrected version if REVISED/REFUTED}"
    before: null | {value: N, unit: "bytes"}
    after: null | {value: N, unit: "bytes"}
    uncertainty_reason: null | "{reason if UNCERTAIN}"
    sources:
      - url: "{source URL}"
        description: "{what it confirmed}"
    evidence:
      - source_url: "{URL}"
        quote: "{exact quote from source}"
        locator: "{section/page/line}"
        why_it_supports: "{explanation}"
verification_summary:
  verified: {N}
  revised: {N}
  refuted: {N}
  uncertain: {N}
dependency_effects:
  - dep_atom_id: A1
    effect: SUPPORTS | CONSTRAINS | CHANGES | CONTRADICTS
    note: "{how this dependency affected the answer}"
sources:
  - url: "{combined source URL}"
    description: "{description}"
---
# Question
{the question}
# Answer
{final answer after incorporating verification}
# Confidence Rationale
{notes}
# Verification Trace
## Claim 1: "{claim}" (Impact: {impact})
- **Verification Q:** {verification_question}
- **Independent Verification:** {verification_answer}
- **Verifier Confidence:** {verifier_confidence}
- **Status:** {status}
- **Impact:** {impact}
### Evidence
- **Quote:** "{quote}"
- **Source:** {source_url}
- **Why:** {why_it_supports}
## Verification Summary
- Claims Verified: {N}
- Claims Revised: {N}
# Dependency Effects
## {dep_atom_id} ({effect})
{note}
```

**Key schema v2 additions:**
- `schema_version`: Enables backward compatibility
- `claim_id`: Stable ID for each claim (e.g., `A1:1`)
- `impact`: How much each claim affects the overall answer
- `evidence`: Embedded quotes/locators from verification research
- `confidence_rationale`: Explains how confidence score was computed
- `dependency_effects`: How upstream atoms affected this answer (for contracted questions)
- `corrected_claim_text`, `before`/`after`, `uncertainty_reason`: Structured correction data

## Rigor Levels

| Level | Re-solve Trigger | Confidence Threshold |
|-------|------------------|---------------------|
| Standard | Never | N/A |
| Thorough | LOW confidence | < 0.4 |
| High-Stakes | Below HIGH | < 0.7 |

## Plugin File Formats

**Commands** (commands/*.md): Frontmatter with `description`, optional `allowed-tools`
**Skills** (skills/*/SKILL.md): Frontmatter with `name`, `description`, `allowed-tools`
**Agents** (agents/*.md): Frontmatter with `name`, `description`, `model`, `tools`

## Distribution

**Claude Code Marketplace:**
- Root `.claude-plugin/marketplace.json` points to `./claude-code`
- Install: `/plugin marketplace add snowmead/questionably-ultrathink`

**skills (other agents):**
- Root `skills/questionably-ultrathink/SKILL.md` enables discovery
- Install: `bunx skills add snowmead/questionably-ultrathink`

## Optional MCP Integration

Parallel.ai servers for enhanced search: `parallel-search`, `parallel-task`
- Setup: Run `/mcp`, authenticate with Parallel.ai
- Fallback: Native `WebSearch`/`WebFetch` if not authenticated
