---
name: questionably-ultrathink
description: Apply full UltraThink reasoning pipeline (AoT + CoVe) to analyze the current problem with maximum rigor
allowed-tools: [Skill, Task, Read, Grep, Glob, WebSearch, WebFetch, AskUserQuestion]
---

# /questionably-ultrathink Command

The user has requested full UltraThink analysis.

**Immediately invoke the questionably-ultrathink skill** using the Skill tool to execute the full pipeline:

Use the Skill tool with:
- skill: "questionably-ultrathink"
- args: "$ARGUMENTS"

The skill contains the complete orchestration protocol for:
1. Intent clarification (AskUserQuestion if needed)
2. Atom of Thoughts decomposition
3. Chain of Verification for critical atoms
4. Synthesis and final verification

Do not duplicate the orchestration logic here—let the skill handle it.
