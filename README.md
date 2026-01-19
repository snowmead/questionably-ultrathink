# Questionably UltraThink

Advanced reasoning plugin integrating Atom of Thoughts (AoT) and Chain of Verification (CoVe) frameworks.

## Installation

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add snowmead/questionably-ultrathink

# Install the plugin
/plugin install questionably-ultrathink@snowmead-marketplace
```

### Other AI Agents (OpenCode, Cursor, Codex, etc.)

```bash
bunx add-skill snowmead/questionably-ultrathink
```

This installs the skill to your agent's skill directory automatically.

## Usage

| Command | Description |
|---------|-------------|
| `/questionably-ultrathink` | Full reasoning pipeline (AoT + CoVe) |
| `/decompose` | Break down complex problems into atomic questions |
| `/verify` | Verify factual claims with independent questioning |

### Automatic Activation

The skill automatically activates when you use trigger phrases:

* "be thorough", "analyze carefully", "make sure this is right"
* "verify", "double-check", "are you sure"
* Complex multi-part questions
* Architecture or security decisions

## How It Works

1. **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG
2. **Chain of Verification (CoVe)** - Verifies each answer through independent questioning with factored execution
3. **Per-Atom Folders** - Each atom has its own folder with `question.md`, `claims.md`, `answer.md`
4. **File-Existence State** - Pipeline state determined by which files exist (no mutable status fields)
5. **Factored Verification** - Verification questions answered by isolated verifiers with zero context about claims

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Query                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Graph Generator                              │
│         Builds question DAG with dependencies                   │
│         Creates: atoms/{id}/question.md for each atom           │
└─────────────────────────────────────────────────────────────────┘
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │ Claim Generator │ │ Claim Generator │ │ Claim Generator │
   │      (A1)       │ │      (A2)       │ │      (A3)       │
   │   [ISOLATED]    │ │   [ISOLATED]    │ │   [ISOLATED]    │
   │  Reads:         │ │  Reads:         │ │  Reads:         │
   │  question.md    │ │  question.md    │ │  question.md    │
   │  Writes:        │ │  Writes:        │ │  Writes:        │
   │  claims.md      │ │  claims.md      │ │  claims.md      │
   │  verifiers/*.md │ │  verifiers/*.md │ │  verifiers/*.md │
   │  (question only)│ │  (question only)│ │  (question only)│
   └─────────────────┘ └─────────────────┘ └─────────────────┘
             │                  │                  │
             ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Factored Verification                         │
│  Verifier reads pre-created file containing ONLY the question   │
│  Verifier has ZERO context about the original claim             │
│  Overwrites: atoms/{id}/verifiers/{N}.md with answer            │
└─────────────────────────────────────────────────────────────────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │    Verifier     │ │    Verifier     │ │    Verifier     │
    │  "What is X?"   │ │  "When was Y?"  │ │  "How does Z?"  │
    │  [NO CONTEXT]   │ │  [NO CONTEXT]   │ │  [NO CONTEXT]   │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Verification Maintainer                         │
│     Reads: claims.md + verifiers/*.md                           │
│     Cross-checks claims vs independent verifier answers         │
│     Marks: VERIFIED | REVISED | REFUTED | UNCERTAIN             │
│     Creates: answer.md with verification trace                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Graph Maintainer                             │
│     Contracts solved answers INTO dependent questions           │
│     Updates question.md: "Given A1=X, A2=Y, what is...?"        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                      [Repeat for each level]
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL Answer                               │
│              Read from atoms/FINAL/answer.md                    │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
.questionably-ultrathink/{session-id}/
├── metadata.md              # DAG structure (immutable)
└── atoms/
    ├── A1/
    │   ├── question.md      # Created by graph-generator
    │   ├── claims.md        # Created by claim-generator
    │   ├── answer.md        # Created by verification-maintainer
    │   └── verifiers/
    │       ├── 1.md         # Pre-created by claim-generator (question only)
    │       │                # Completed by verifier (adds answer)
    │       └── 2.md
    └── FINAL/
        └── ...
```

**State = File Existence + Content:**

* `question.md` exists → atom created
* `claims.md` exists → claims generated
* `verifiers/{N}.md` exists with question only → pre-created, ready for verifier
* `verifiers/{N}.md` has "# Answer" section → verification question answered
* `answer.md` exists → verification complete

**Key insight:** Factored verification from the CoVe paper. Each verifier reads a pre-created file containing ONLY the verification question - no claim text. The verifier has ZERO knowledge of the original claim. This prevents bias - when verifiers don't know the "expected" answer, they can't be biased toward confirming it.

### Rigor Levels

| Level | Re-solve Trigger | Use Case |
|-------|------------------|----------|
| **Standard** | Never (single pass) | Most questions |
| **Thorough** | LOW confidence atoms | Important decisions |
| **High-Stakes** | Below HIGH confidence | Security, architecture, production |

## Optional: Parallel.ai MCP Integration

The plugin includes optional MCP servers for enhanced web search during verification:

* `parallel-search` - Optimized fact-checking searches
* `parallel-task` - Deep research capabilities

**Setup:** Run `/mcp` in Claude Code and authenticate with Parallel.ai.

**Fallback:** Works fully without MCP, using native `WebSearch` and `WebFetch` tools.

## References

* [Atom of Thoughts Paper](https://arxiv.org/abs/2502.12018) - HKUST, 2025
* [Chain-of-Verification Paper](https://arxiv.org/abs/2309.11495) - Meta AI, 2023
