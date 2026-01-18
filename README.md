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
2. **Chain of Verification (CoVe)** - Verifies each answer through independent questioning
3. **Isolated Solving** - Each atomic question solved in complete isolation to prevent bias

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
│         (creates atoms A1, A2, A3... but does NOT solve)        │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Atomic Solver  │ │  Atomic Solver  │ │  Atomic Solver  │
│      (A1)       │ │      (A2)       │ │      (A3)       │
│   [ISOLATED]    │ │   [ISOLATED]    │ │   [ISOLATED]    │
│  Sees only A1   │ │  Sees only A2   │ │  Sees only A3   │
│  + self-verify  │ │  + self-verify  │ │  + self-verify  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Graph Maintainer                             │
│     Contracts solved answers INTO dependent questions           │
│     A4 becomes: "Given A1=X, A2=Y, what is...?"                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Repeat for each level]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL Answer                               │
│              Synthesis with confidence scores                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** Each Atomic Solver runs in complete isolation. It only sees its own question (with dependency answers baked in). This prevents bias contamination that occurs when one solver knows about other questions.

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

## License

MIT
