# Questionably UltraThink

A Claude Code plugin that integrates **Chain of Verification (CoVe)** and **Atom of Thoughts (AoT)** reasoning frameworks for rigorous, verifiable analysis.

## What It Does

UltraThink enhances Claude's reasoning with two research-backed frameworks:

- **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG, solving them systematically
- **Chain of Verification (CoVe)** - Verifies factual claims through independent questioning to reduce hallucinations

## Installation

```bash
# Add the marketplace
/plugin marketplace add snowmead/questionably-ultrathink

# Install the plugin
/plugin install questionably-ultrathink@snowmead-marketplace
```

## Development Setup

For contributors working on this plugin:

```bash
./setup.sh
```

This installs dependencies (lefthook, comrak) if missing and sets up git hooks for automatic markdown formatting on commit.

## Commands

### `/questionably-ultrathink`

Run the full reasoning pipeline on a problem:

1. Clarifies intent if needed
2. Selects analysis rigor (standard/thorough/high-stakes)
3. Decomposes into atomic questions (AoT) with complexity flagging
4. Verifies critical atoms in parallel by dependency level (CoVe)
5. Propagates corrections and recomputes dependent atoms
6. Synthesizes and verifies final response
7. Iterates if confidence is below threshold (thorough/high-stakes only)

```
/questionably-ultrathink analyze whether this authentication approach is secure
```

### `/decompose`

Break down a complex problem into atomic sub-questions:

```
/decompose how does React's reconciliation work and compare to Vue?
```

### `/verify`

Verify factual claims in the most recent response:

```
/verify
```

Or verify specific content:

```
/verify the performance benchmarks mentioned above
```

## Automatic Activation

The skill automatically activates when you use trigger phrases:

- "be thorough", "analyze carefully", "make sure this is right"
- "verify", "double-check", "are you sure"
- Complex multi-part questions
- Architecture or security decisions

## Rigor Levels

When running the full pipeline, you can select analysis depth:

| Level           | Iterations | Verification              | Confidence Target | Use Case                           |
| --------------- | ---------- | ------------------------- | ----------------- | ---------------------------------- |
| **Standard**    | 1          | Flagged atoms only        | N/A               | Most questions                     |
| **Thorough**    | Up to 2    | Atoms with factual claims | ≥70%              | Important decisions                |
| **High-Stakes** | Up to 3    | ALL atoms                 | ≥85%              | Security, architecture, production |

## Optional: Parallel.ai MCP Integration

The plugin includes optional MCP servers for enhanced web search during verification:

- `parallel-search` - Optimized fact-checking searches
- `parallel-task` - Deep research capabilities

**Setup:** Run `/mcp` in Claude Code and authenticate with Parallel.ai to enable them.

**Fallback:** The plugin works fully without MCP authentication, using native `WebSearch` and `WebFetch` tools.

## How It Works

### Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                          User Commands                            │
│        /questionably-ultrathink  |  /decompose  |  /verify        │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                       Skill Orchestrator                          │
│                 (skills/questionably-ultrathink)                  │
│                                                                   │
│  1. Clarify intent (AskUserQuestion)                              │
│  2. Select rigor level                                            │
│  3. Generate session ID                                           │
│  4. Invoke agents in sequence                                     │
│  5. Check for corrections after each verification wave            │
│  6. Iterate if confidence below threshold                         │
└───────────┬───────────────────────┬───────────────────┬───────────┘
            │                       │                   │
            ▼                       ▼                   ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   atom-of-        │   │   chain-of-       │   │   aot-recompute   │
│   thoughts        │   │   verification    │   │                   │
│                   │   │                   │   │                   │
│ Decomposes        │   │ Verifies atoms    │   │ Updates atoms     │
│ problem into      │   │ independently     │   │ after CoV         │
│ atomic DAG        │   │ (factored exec)   │   │ corrections       │
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│              .questionably-ultrathink/{session-id}/               │
│                   (File-Based Communication)                      │
│                                                                   │
│  metadata.md            atoms/              corrections/          │
│  ├─ session_id          ├─ A1.md            ├─ A1.md (if errors)  │
│  ├─ rigor               ├─ A2.md            └─ ...                │
│  ├─ atoms (levels)      ├─ A3.md                                  │
│  └─ verification_order  └─ FINAL.md                               │
└───────────────────────────────────────────────────────────────────┘
```

**Data Flow:**

1. **User invokes command** → Skill orchestrator begins
2. **Orchestrator → AoT**: Decomposes problem, writes `metadata.md` + atom files
3. **Orchestrator reads** `metadata.md` to get verification order (atoms grouped by dependency level)
4. **Orchestrator → CoV**: Verifies atoms at each level (parallel within level)
5. **CoV writes** correction files if errors found
6. **Orchestrator checks** for corrections after each wave
7. **If corrections exist → aot-recompute**: Updates dependent atoms with corrected premises
8. **Recomputed atoms re-verified** before proceeding to next level
9. **Final synthesis** combines all verified/corrected atoms

### Atom of Thoughts (AoT)

Based on the paper ["Atom of Thoughts for Markov LLM Test-Time Scaling"](https://arxiv.org/abs/2502.12018) (HKUST, 2025).

Key features:

- Decomposes problems into atomic questions
- Builds a DAG of dependencies with topological levels
- Solves independent atoms in parallel
- Contracts solved atoms into minimal context for dependent atoms
- Follows Markov property (each step depends only on immediate dependencies)
- Flags atoms requiring verification (`needs_cov`) based on complexity heuristics
- Persists reasoning to files for inter-agent communication

### Chain of Verification (CoVe)

Based on the paper ["Chain-of-Verification Reduces Hallucination in LLMs"](https://arxiv.org/abs/2309.11495) (Meta AI, 2023).

Key features:

- Extracts verifiable factual claims
- Generates targeted verification questions
- Answers each question **independently** (factored execution)
- Compares independent answers to original claims
- Reports inconsistencies with corrections
- Verifies atoms in parallel by dependency level
- Writes corrections to disk, triggering recomputation of dependent atoms

## Output Format

### AoT Decomposition

```
## Atom of Thoughts Decomposition

### Dependency Graph
- [ATOM:A1] What auth standard fits a stateless API? (level 0, needs_cov: true)
- [ATOM:A2] Where should tokens be validated? (level 0, needs_cov: false)
- [ATOM:A3] How should tokens be stored client-side? (level 1, deps: [A1], needs_cov: true)
- [ATOM:FINAL] Complete auth approach recommendation (level 2, deps: [A2, A3])

### Solutions
[ATOM:A1] JWT - stateless, self-contained, widely supported
[ATOM:A2] Middleware layer before route handlers
...

### Verification Summary
- [ATOM:A1] needs_cov: true, confidence: high
- [ATOM:A2] needs_cov: false, confidence: high
- [ATOM:A3] needs_cov: true, confidence: medium
```

### CoVe Report

```
## Chain of Verification Report

### Verification Results

**Claim 1:** "React was released in 2013"
- Verification Q: When was React first publicly released?
- Independent Answer: React was released in May 2013 at JSConf US
- Status: ✓ VERIFIED

**Claim 2:** "Virtual DOM was invented by React"
- Verification Q: Who invented the virtual DOM concept?
- Independent Answer: While React popularized it, similar concepts existed earlier
- Status: ⚠️ INCONSISTENT
```

## Confidence Markers

After using UltraThink, responses are marked:

- **[VERIFIED]** - Passed CoVe verification
- **[HIGH CONFIDENCE]** - Decomposed and analyzed systematically
- **[NEEDS EXTERNAL VERIFICATION]** - User should confirm externally
- **[UNCERTAIN]** - Flagged areas of doubt remain

## When NOT to Use

Skip UltraThink for:

- Simple, direct questions
- Opinion or recommendation requests
- Quick lookups where speed matters
- Questions you already have high confidence in

## License

MIT

## References

- [Chain-of-Verification Paper](https://arxiv.org/abs/2309.11495) - Meta AI, 2023
- [Atom of Thoughts Paper](https://arxiv.org/abs/2502.12018) - HKUST, 2025
- [CoVe Implementation](https://github.com/ritun16/chain-of-verification)
- [AoT Implementation](https://github.com/qixucen/atom)
