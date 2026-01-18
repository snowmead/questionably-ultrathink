# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build dist/ for npm publishing
bun run build

# Run interactive installer (choose platform)
bun run install

# First-time setup (installs lefthook, comrak, sets up git hooks)
./setup.sh

# Validate plugin structure (run by CI)
./scripts/validate-plugin.sh

# Validate frontmatter syntax (run by CI)
python3 scripts/check-frontmatter.py claude-code/**/*.md opencode/**/*.md
```

## Overview

This is a Claude Code plugin that integrates two research-backed reasoning frameworks:
- **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG
- **Chain of Verification (CoVe)** - Verifies factual claims through independent questioning to reduce hallucinations

## Architecture

```
questionably-ultrathink/
├── .claude-plugin/
│   ├── plugin.json          # Plugin metadata (name, version, author)
│   └── marketplace.json     # Marketplace registration (source → ./claude-code)
├── .mcp.json                 # MCP server configuration (optional Parallel.ai)
│
├── claude-code/              # Claude Code plugin source
│   ├── .claude-plugin/
│   │   └── plugin.json       # Plugin manifest
│   ├── agents/
│   │   ├── aot-graph-generator.md    # Builds question DAG (no solving)
│   │   ├── aot-graph-maintainer.md   # Contracts questions with solved answers
│   │   └── cov-atomic-solver.md      # Solves ONE question in isolation
│   ├── commands/
│   │   ├── questionably-ultrathink.md
│   │   ├── decompose.md
│   │   └── verify.md
│   └── skills/
│       └── questionably-ultrathink-skill/
│           └── SKILL.md
│
├── opencode/                 # OpenCode source (independent)
│   ├── agent/
│   │   ├── questionably-ultrathink.md   # Primary orchestrator
│   │   ├── aot-graph-generator.md       # Builds question DAG (no solving)
│   │   ├── aot-graph-maintainer.md      # Contracts questions with solved answers
│   │   └── cov-atomic-solver.md         # Solves ONE question in isolation
│   └── command/
│       ├── questionably-ultrathink.md
│       ├── decompose.md
│       └── verify.md
│
├── hooks/
│   └── hooks.json            # Hook configuration (currently empty)
├── scripts/
│   ├── build-dist.ts         # Build script for npm distribution
│   └── install-plugin.ts     # Interactive installer
└── dist/                     # Built for npm
    ├── claude-code/
    └── opencode/
```

## How Components Connect

1. **Commands** (`/questionably-ultrathink`, `/decompose`, `/verify`) are entry points that invoke either the skill or agents directly
2. **Skill** (`skills/questionably-ultrathink-skill/SKILL.md`) orchestrates the full pipeline by chaining agent calls

**Note:** The skill is named `questionably-ultrathink-skill` (not `questionably-ultrathink`) to avoid naming collision with the command. When the Skill tool looks up by name, having different names ensures the correct component is loaded.
3. **Agents** are subagents invoked via the `Task` tool with `subagent_type`:
   - `questionably-ultrathink:aot-graph-generator` - Builds question DAG (no solving)
   - `questionably-ultrathink:aot-graph-maintainer` - Contracts questions with solved answers
   - `questionably-ultrathink:cov-atomic-solver` - Solves ONE question in isolation

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
├── graph.md          # DAG structure from Graph Generator
├── atoms/
│   ├── A1.md         # Solved answer for atom A1
│   ├── A2.md
│   └── FINAL.md
└── contracted/       # Rewritten questions with baked-in answers
    ├── A3.md         # A3 question with A1's answer baked in
    └── ...
```

**Data flow:**
1. Skill generates session ID and determines rigor level
2. Skill invokes Graph Generator → writes `graph.md` with DAG structure
3. For each level, Skill spawns fresh Atomic Solvers (one per atom)
4. Each solver writes its answer to `atoms/{atom_id}.md`
5. Skill invokes Graph Maintainer → writes contracted questions for next level
6. Repeat until FINAL is solved
7. Synthesize response from all solved atoms

**Why files?** Subagents don't share context. Files enable inter-agent communication without bloating context windows.

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
- **publish.yml**: Publishes to npm when tags are pushed.

Pre-commit hooks (via lefthook):
- `format-markdown`: Formats non-plugin markdown files with comrak
- `validate-plugin`: Runs `claude plugin validate .`

## Dual Platform Support (Claude Code + OpenCode)

This plugin supports both Claude Code and OpenCode with **separate source directories**:

- **Claude Code source**: `claude-code/` (agents, commands, skills)
- **OpenCode source**: `opencode/` (agent, command)

The platforms have fundamental differences (Claude Code has Skills, OpenCode doesn't), so each platform has its own independent source files.

### Development Guidelines

1. **Edit Claude Code files** in `claude-code/agents/`, `claude-code/commands/`, `claude-code/skills/`
2. **Edit OpenCode files** in `opencode/agent/`, `opencode/command/`
3. **Test on both platforms** when making changes

### Marketplace Compatibility

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

## NPM Distribution

The plugin can be installed globally via npm/bun for easy distribution.

### Building and Publishing

```bash
bun run build                # Creates dist/ with both platforms
bun publish                  # Publish to npm (requires npm login)
```

**Install locations after `bunx questionably-ultrathink install`:**
- Claude Code: `~/.claude/plugins/questionably-ultrathink/`
- OpenCode: `~/.config/opencode/`
