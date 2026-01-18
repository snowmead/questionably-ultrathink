# Questionably UltraThink

A Claude Code plugin that integrates **Chain of Verification (CoVe)** and **Atom of Thoughts (AoT)** reasoning frameworks for rigorous, verifiable analysis.

## What It Does

UltraThink enhances Claude's reasoning with two research-backed frameworks:

- **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG, solving them systematically
- **Chain of Verification (CoVe)** - Verifies factual claims through independent questioning to reduce hallucinations

## Installation

```bash
bunx questionably-ultrathink install
```

> **Alternative:** Claude Code users can also install via marketplace:
> ```bash
> /plugin marketplace add snowmead/questionably-ultrathink
> /plugin install questionably-ultrathink@snowmead-marketplace
> ```

## Usage

### Claude Code

```
/questionably-ultrathink analyze whether this authentication approach is secure
```

### OpenCode

```
@questionably-ultrathink analyze whether this authentication approach is secure
```

## Development Setup

For contributors working on this plugin:

```bash
./setup.sh
```

This installs dependencies (lefthook, comrak) if missing and sets up git hooks for automatic markdown formatting on commit.

## Commands

### `/questionably-ultrathink` (Claude Code) / `@questionably-ultrathink` (OpenCode)

Run the full reasoning pipeline on a problem:

1. Clarifies intent if needed
2. Selects analysis rigor (standard/thorough/high-stakes)
3. Graph Generator builds DAG of atomic questions (no solving)
4. For each level: spawns isolated Atomic Solvers (one per question)
5. Graph Maintainer contracts solved answers into dependent questions
6. Repeats until FINAL atom is solved
7. Synthesizes final response from all solved atoms
8. Re-solves low-confidence atoms if rigor requires it

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

| Level           | Re-solve Trigger | Confidence Threshold | Use Case                           |
| --------------- | ---------------- | -------------------- | ---------------------------------- |
| **Standard**    | Never            | N/A (single pass)    | Most questions                     |
| **Thorough**    | LOW confidence   | score < 0.4          | Important decisions                |
| **High-Stakes** | Below HIGH       | score < 0.7          | Security, architecture, production |

**Confidence Scoring:** Atoms receive numerical scores (0.0-1.0) mapped to categories:
- 0.0-0.4 = LOW
- 0.4-0.7 = MEDIUM
- 0.7-1.0 = HIGH

For High-Stakes rigor, an optional **Judge** agent evaluates answer quality across atoms, checking for coherence, contradictions, and completeness.

## Optional: Parallel.ai MCP Integration

The plugin includes optional MCP servers for enhanced web search during verification:

- `parallel-search` - Optimized fact-checking searches
- `parallel-task` - Deep research capabilities

**Setup:** Run `/mcp` in Claude Code and authenticate with Parallel.ai to enable them.

**Fallback:** The plugin works fully without MCP authentication, using native `WebSearch` and `WebFetch` tools.

## How It Works

### Architecture: Isolated Solving with Question Contraction

Traditional decomposition approaches have a critical flaw: the same agent that generates questions also sees all answers, creating bias contamination. UltraThink solves this with **true factored execution**:

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
│  3. Invoke Graph Generator (DAG only, no solving)                 │
│  4. For each level: spawn isolated Atomic Solvers                 │
│  5. Graph Maintainer contracts solved answers into questions      │
│  6. Repeat until FINAL solved                                     │
│  7. Synthesize final response                                     │
└───────────┬───────────────────────┬───────────────────┬───────────┘
            │                       │                   │
            ▼                       ▼                   ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   aot-graph-      │   │   cov-atomic-     │   │   aot-graph-      │
│   generator       │   │   solver          │   │   maintainer      │
│                   │   │                   │   │                   │
│ Builds DAG of     │   │ Answers ONE       │   │ Contracts solved  │
│ questions only    │   │ question per      │   │ answers into      │
│ (no solving)      │   │ spawn (isolated)  │   │ dependent Qs      │
└───────────────────┘   └───────────────────┘   └───────────────────┘
                                │
                                ▼ (High-Stakes only)
                        ┌───────────────────┐
                        │    aot-judge      │
                        │                   │
                        │ Evaluates answer  │
                        │ quality, flags    │
                        │ atoms for re-solve│
                        └───────────────────┘
```

**Key Innovation: Complete Isolation**

Each `cov-atomic-solver` spawn sees ONLY its contracted question - nothing else. This prevents bias contamination where knowledge of other questions/answers influences responses.

**Data Flow:**

1. **User invokes command** → Skill orchestrator begins
2. **Graph Generator** creates the DAG of questions (no solving happens here)
3. **For each dependency level**, orchestrator spawns fresh `cov-atomic-solver` instances
4. **Each solver** answers its ONE question in complete isolation with self-verification
5. **Graph Maintainer** rewrites dependent questions, baking in solved answers
6. **Repeat** until FINAL atom is solved
7. **Synthesize** final response from all solved atoms

### Atom of Thoughts (AoT)

Based on the paper ["Atom of Thoughts for Markov LLM Test-Time Scaling"](https://arxiv.org/abs/2502.12018) (HKUST, 2025).

Key features:

- **Graph Generator** decomposes problems into atomic questions
- Builds a DAG of dependencies with topological levels
- Questions are created WITHOUT solving (prevents contamination)
- **Graph Maintainer** contracts solved atoms into dependent questions
- Follows Markov property (each step depends only on immediate dependencies)

### Chain of Verification (CoVe)

Based on the paper ["Chain-of-Verification Reduces Hallucination in LLMs"](https://arxiv.org/abs/2309.11495) (Meta AI, 2023).

Key features:

- **Atomic Solver** answers ONE question per spawn (true isolation)
- Self-verifies its own answer before returning
- Uses web search for factual claims when needed
- Numerical confidence scoring (0.0-1.0) with categorical labels
- Full verification trace preserved for audit trail
- Complete independence from other atoms prevents bias propagation

## Output Format

### Graph Structure (from Graph Generator)

```
## Atom of Thoughts - Question Graph

### Dependency Graph
- [A1] What auth standard fits a stateless API? (level 0)
- [A2] Where should tokens be validated? (level 0)
- [A3] How should tokens be stored client-side? (level 1, deps: [A1])
- [FINAL] Complete auth approach recommendation (level 2, deps: [A2, A3])
```

### Solved Atom (from Atomic Solver)

```
---
atom_id: A1
level: 0
dependencies: []
status: solved
solved_at: 2025-01-18T15:30:00Z
solve_attempts: 1
confidence_score: 0.85
---

# Question
What auth standard fits a stateless API?

# Verification Trace

## Initial Answer
JWT tokens are commonly used for stateless APIs.

## Self-Verification

**Claim 1:** "JWT is the standard for stateless APIs"
- Verification Q: What authentication standard is recommended for stateless REST APIs?
- Independent Answer: JWT (JSON Web Tokens) - self-contained, no server-side session storage
- Status: ✓ VERIFIED

# Answer
JWT (JSON Web Tokens) - stateless, self-contained, widely supported

# Confidence
0.85 (HIGH) - Multiple authoritative sources confirm JWT is the standard
```

### Contracted Question (from Graph Maintainer)

```
## Contracted: A3

**Original Question:** How should tokens be stored client-side?

**Contracted Question:** Given that JWT is the recommended auth standard for stateless APIs,
how should JWT tokens be stored client-side?

**Baked-in Context:**
- A1: JWT - stateless, self-contained, widely supported
```

## Confidence Markers

After using UltraThink, responses are marked:

- **[VERIFIED]** - All atoms passed self-verification
- **[HIGH CONFIDENCE]** - Most atoms HIGH (0.7+), no LOW
- **[NEEDS EXTERNAL VERIFICATION]** - User should confirm externally
- **[UNCERTAIN]** - Significant LOW confidence atoms remain

Each atom includes a numerical confidence score (0.0-1.0) with categorical label and explanation, providing an audit trail for how answers were derived.

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
