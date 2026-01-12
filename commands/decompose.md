---
name: decompose
description: Decompose a complex problem into atomic sub-questions using Atom of Thoughts
allowed-tools: [Task, AskUserQuestion, Read]
---

# /decompose Command

Decompose the specified problem into atomic sub-questions.

<steps>
## Execution Steps

1. **Identify the problem** from context or ask the user for clarification

2. **Invoke the atom-of-thoughts agent:**
   ```
   Task tool:
   - subagent_type: "atom-of-thoughts"
   - prompt: "Decompose this problem: {problem statement}"
   ```

3. **Present results** showing:
   - The atom dependency graph
   - Solutions for each atom
   - Any atoms flagged [NEEDS VERIFICATION]
   - The final synthesized answer
</steps>

<follow_up>
If atoms are flagged [NEEDS VERIFICATION], offer to run `/verify` on them.
</follow_up>
