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

## Overview

This is a Claude Code plugin that integrates two research-backed reasoning frameworks:
- **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG
- **Chain of Verification (CoVe)** - Verifies factual claims through independent questioning to reduce hallucinations

## Installation

**Claude Code:**
```bash
/plugin marketplace add snowmead/questionably-ultrathink
/plugin install questionably-ultrathink@snowmead-marketplace
```

**Other Agents (OpenCode, Cursor, Codex, etc.):**
```bash
bunx add-skill snowmead/questionably-ultrathink
```

## Architecture

```
questionably-ultrathink/
├── .claude-plugin/
│   ├── plugin.json          # Plugin metadata (name, version, author)
│   └── marketplace.json     # Marketplace registration (source → ./claude-code)
│
├── claude-code/              # Claude Code plugin source
│   ├── .claude-plugin/
│   │   └── plugin.json       # Plugin manifest
│   ├── .mcp.json             # MCP server configuration (optional Parallel.ai)
│   ├── agents/
│   │   ├── aot-graph-generator.md    # Builds question DAG (no solving)
│   │   ├── aot-graph-maintainer.md   # Contracts questions with solved answers
│   │   ├── cov-atomic-solver.md      # Solves ONE question in isolation
│   │   └── aot-judge.md              # Evaluates answer quality (High-Stakes)
│   ├── commands/
│   │   ├── questionably-ultrathink.md
│   │   ├── decompose.md
│   │   └── verify.md
│   └── skills/
│       └── questionably-ultrathink-skill/
│           └── SKILL.md
│
├── skills/                   # Root skills/ for add-skill discovery
│   └── questionably-ultrathink/
│       └── SKILL.md          # Universal skill for other agents
│
├── hooks/
│   └── hooks.json            # Hook configuration
└── scripts/
    ├── check-frontmatter.py  # CI: Validate YAML frontmatter
    └── validate-plugin.sh    # CI: Validate plugin structure
```

## How Components Connect

1. **Commands** (`/questionably-ultrathink`, `/decompose`, `/verify`) are entry points that invoke either the skill or agents directly
2. **Skill** (`skills/questionably-ultrathink-skill/SKILL.md`) orchestrates the full pipeline by chaining agent calls

**Note:** The skill is named `questionably-ultrathink-skill` (not `questionably-ultrathink`) to avoid naming collision with the command. When the Skill tool looks up by name, having different names ensures the correct component is loaded.

3. **Agents** are subagents invoked via the `Task` tool with `subagent_type`:
   - `questionably-ultrathink:aot-graph-generator` - Builds question DAG (no solving)
   - `questionably-ultrathink:aot-graph-maintainer` - Contracts questions with solved answers
   - `questionably-ultrathink:cov-atomic-solver` - Solves ONE question in isolation
   - `questionably-ultrathink:aot-judge` - Evaluates answer quality (High-Stakes only)

## Plugin File Formats

### Commands (commands/*.md)
Frontmatter with `name`, `description`, `allowed-tools`. Body contains execution instructions.

### Skills (skills/*/SKILL.md)
Frontmatter with `name`, `description`, optional `hooks`, `allowed-tools`. Body contains detailed orchestration logic.

### Agents (agents/*.md)
Frontmatter with `name`, `description`, `model`, `tools`. Body contains agent behavior instructions.

## Key Implementation Details

- Agents run on `haiku` model for efficiency
- **True factored execution**: each atomic solver sees ONLY its contracted question
- Graph Generator creates DAG structure WITHOUT solving (prevents bias contamination)
- Graph Maintainer "contracts" solved answers INTO dependent questions
- Each solver spawn is completely isolated from other atoms
- Follows Markov property: each atom depends only on immediate dependencies

## Architecture: Isolated Solving

The key innovation is **complete isolation**. Traditional approaches have the same agent see all questions/answers, causing bias. UltraThink solves this:

1. **Graph Generator** creates ONLY the DAG of questions (no solving)
2. **Atomic Solver** answers ONE question per spawn (complete isolation)
3. **Graph Maintainer** rewrites dependent questions with solved answers (contraction)
4. Each solver sees ONLY its contracted question - nothing else

**Why this matters:** When a solver answers "How should JWT tokens be stored?", it doesn't know what other questions exist or how they were answered. It only sees the question with dependency answers baked in.

## Inter-Agent Communication

Agents communicate via files in `.questionably-ultrathink/{session-id}/`:

```
.questionably-ultrathink/{session-id}/
├── metadata.md       # DAG structure and session config from Graph Generator
└── atoms/
    ├── A1.md         # Atom file (question → solved answer with verification trace)
    ├── A2.md
    ├── A3.md         # Contracted questions have "Given..." context inline
    └── FINAL.md
```

**Note:** Contractions happen inline within atom files (via "Given..." prefixes), not in a separate directory.

**Data flow:**
1. Skill generates session ID and determines rigor level
2. Skill invokes Graph Generator → writes `metadata.md` with DAG structure + atom files (questions only)
3. For each level, Skill spawns fresh Atomic Solvers (one per atom, in parallel)
4. Skill extracts solver output and updates atom files with answer, verification trace, sources, and confidence
5. Skill invokes Graph Maintainer → rewrites next-level atom questions with "Given..." context
6. Repeat until FINAL is solved
7. Synthesize response from all solved atoms

**Why files?** Subagents don't share context. Files enable inter-agent communication without bloating context windows.

**Note on verification traces:** The solver outputs detailed self-verification steps. The skill preserves these traces in atom files for audit purposes, though the final response uses summarized answers.

## Confidence Markers

Responses are tagged with: `[VERIFIED]`, `[HIGH CONFIDENCE]`, `[NEEDS EXTERNAL VERIFICATION]`, or `[UNCERTAIN]`

## Optional MCP Integration

The plugin includes optional Parallel.ai MCP servers for enhanced web search during verification:

- `parallel-search` - Optimized fact-checking searches
- `parallel-task` - Deep research capabilities

**Setup:** These servers require OAuth authentication. Run `/mcp` in Claude Code and authenticate with Parallel.ai to enable them.

**Fallback:** The CoVe agent automatically falls back to native `WebSearch` and `WebFetch` tools if Parallel.ai is not authenticated. The plugin works fully without MCP authentication.

## CI/CD

- **validate.yml**: Runs on push/PR to main/develop. Validates plugin structure and frontmatter syntax.

Pre-commit hooks (via lefthook):
- `format-markdown`: Formats non-plugin markdown files with comrak
- `validate-plugin`: Runs `claude plugin validate .`

## Marketplace Compatibility

The `.claude-plugin/marketplace.json` at the repo root points to `./claude-code`:

```json
{
  "plugins": [{
    "name": "questionably-ultrathink",
    "source": "./claude-code"
  }]
}
```

This allows `/plugin marketplace add snowmead/questionably-ultrathink` to work correctly.

## add-skill Compatibility

The root `skills/questionably-ultrathink/` directory enables discovery by `add-skill`:

```bash
bunx add-skill snowmead/questionably-ultrathink
```

This installs the skill to agent-specific directories:
- Claude Code → `.claude/skills/`
- OpenCode → `.opencode/skill/`
- Cursor → `.cursor/skills/`
- Codex → `.codex/skills/`
