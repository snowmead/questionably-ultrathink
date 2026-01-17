# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│   │   ├── atom-of-thoughts.md
│   │   ├── chain-of-verification.md
│   │   └── aot-recompute.md
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
│   │   ├── atom-of-thoughts.md
│   │   ├── chain-of-verification.md
│   │   └── aot-recompute.md
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
   - `questionably-ultrathink:atom-of-thoughts` - Initial problem decomposition
   - `questionably-ultrathink:chain-of-verification` - Verifies atoms and writes corrections
   - `questionably-ultrathink:aot-recompute` - Updates dependent atoms after corrections found

## Plugin File Formats

### Commands (commands/*.md)
Frontmatter with `name`, `description`, `allowed-tools`. Body contains execution instructions.

### Skills (skills/*/SKILL.md)
Frontmatter with `name`, `description`, optional `hooks`, `allowed-tools`. Body contains detailed orchestration logic.

### Agents (agents/*.md)
Frontmatter with `name`, `description`, `model`, `tools`. Body contains agent behavior instructions.

## Key Implementation Details

- Agents run on `haiku` model for efficiency
- AoT follows Markov property: each atom depends only on immediate dependencies
- CoVe uses "factored execution": verification questions answered independently without referencing original claims
- Both agents have mandatory clarification gates before proceeding with analysis
- Full pipeline requires all 5 phases: clarify → decompose → verify atoms → synthesize → final verification

## Inter-Agent Communication

Agents communicate via files in `.questionably-ultrathink/{session-id}/`:

```
.questionably-ultrathink/{session-id}/
├── metadata.md       # Session config: rigor, atoms, levels, verification_order
├── atoms/
│   ├── A1.md         # Detailed reasoning for atom A1
│   ├── A2.md
│   └── FINAL.md
└── corrections/      # Written by CoV when errors found
    ├── A1.md         # Correction details for atom A1
    └── ...
```

**Data flow:**
1. Skill generates session ID and determines rigor level
2. Skill invokes AoT with session ID and rigor
3. AoT writes `metadata.md` (with rigor, atoms, verification_order) and atom files
4. Skill reads `metadata.md` to get verification order
5. For each verification level, Skill invokes CoV for atoms needing verification
6. CoV reads atom files, verifies, and writes correction files if errors found
7. Skill checks for corrections after each wave
8. If corrections exist, Skill invokes `aot-recompute` to update dependent atoms
9. Recomputed atoms are re-verified before proceeding

**Why files?** Subagents don't share context. Files enable inter-agent communication without bloating context windows.

## Confidence Markers

Responses are tagged with: `[VERIFIED]`, `[HIGH CONFIDENCE]`, `[NEEDS EXTERNAL VERIFICATION]`, or `[UNCERTAIN]`

## Optional MCP Integration

The plugin includes optional Parallel.ai MCP servers for enhanced web search during verification:

- `parallel-search` - Optimized fact-checking searches
- `parallel-task` - Deep research capabilities

**Setup:** These servers require OAuth authentication. Run `/mcp` in Claude Code and authenticate with Parallel.ai to enable them.

**Fallback:** The CoVe agent automatically falls back to native `WebSearch` and `WebFetch` tools if Parallel.ai is not authenticated. The plugin works fully without MCP authentication.

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

### Building for Distribution

```bash
# Build dist/ for npm publishing
bun run build
```

This creates:
```
dist/
├── claude-code/     # Claude Code format files
│   ├── agents/
│   ├── commands/
│   ├── skills/
│   └── .claude-plugin/
└── opencode/        # OpenCode format files
    ├── agent/
    └── command/
```

### Installing the Plugin

```bash
# Install globally
bun add -g questionably-ultrathink

# Or install to specific platform
questionably-ultrathink install --claude-code
questionably-ultrathink install --opencode
questionably-ultrathink install --both
```

**Install locations:**
- Claude Code: `~/.claude/plugins/questionably-ultrathink/`
- OpenCode: `~/.config/opencode/`

### Usage After Installation

- **Claude Code**: `/questionably-ultrathink "your question"`
- **OpenCode**: `@questionably-ultrathink "your question"`
