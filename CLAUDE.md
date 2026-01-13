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
│   └── marketplace.json     # Marketplace registration
├── .mcp.json                 # MCP server configuration (optional Parallel.ai)
├── commands/                 # User-invocable slash commands
│   ├── questionably-ultrathink.md  # /questionably-ultrathink - full pipeline
│   ├── decompose.md         # /decompose - AoT only
│   └── verify.md            # /verify - CoVe only
├── skills/
│   └── questionably-ultrathink-skill/
│       └── SKILL.md         # Main skill orchestration with pipeline steps
├── agents/
│   ├── atom-of-thoughts.md  # AoT agent - initial decomposition (haiku model)
│   ├── aot-recompute.md     # Recomputation agent - updates atoms after corrections (haiku model)
│   └── chain-of-verification.md  # CoVe agent (haiku model)
└── hooks/
    └── hooks.json           # Hook configuration (currently empty)
```

## How Components Connect

1. **Commands** (`/questionably-ultrathink`, `/decompose`, `/verify`) are entry points that invoke either the skill or agents directly
2. **Skill** (`skills/questionably-ultrathink-skill/SKILL.md`) orchestrates the full pipeline by chaining agent calls

**Note:** The skill is named `questionably-ultrathink-skill` (not `questionably-ultrathink`) to avoid naming collision with the command. When the Skill tool looks up by name, having different names ensures the correct component is loaded.
3. **Agents** are subagents invoked via the `Task` tool with `subagent_type`:
   - `atom-of-thoughts` - Initial problem decomposition
   - `chain-of-verification` - Verifies atoms and writes corrections
   - `aot-recompute` - Updates dependent atoms after corrections found

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
