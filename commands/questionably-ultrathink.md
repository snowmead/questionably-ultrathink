-----

## name: questionably-ultrathink description: Apply full UltraThink reasoning pipeline (AoT + CoVe) to analyze the current problem with maximum rigor allowed-tools: \[Skill, Task, Read, Grep, Glob, WebSearch, WebFetch, AskUserQuestion\]

# /questionably-ultrathink Command

The user has requested full UltraThink analysis.

**Immediately invoke the questionably-ultrathink skill** using the Skill tool to execute the full pipeline:

Use the Skill tool with:

- skill: "questionably-ultrathink"
- args: "$ARGUMENTS"

The skill contains the complete orchestration protocol for:

1. Intent clarification (AskUserQuestion if needed)
2. Atom of Thoughts decomposition (with complexity flagging)
3. Parallel Chain of Verification for critical atoms (by dependency level)
4. Synthesis and final verification
5. Optional iterative refinement for high-stakes or low-confidence results

Do not duplicate the orchestration logic here—let the skill handle it.
