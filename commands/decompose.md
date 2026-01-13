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
   
       Task tool:
       - subagent_type: "questionably-ultrathink:atom-of-thoughts"
       - prompt: "Decompose this problem: {problem statement}"

3. **Present results** showing:
   
   - The atom dependency graph with dependency levels
   - Solutions for each atom
   - Verification summary (which atoms have `needs_cov: true`)
   - The final synthesized answer

</steps>

\<follow\_up\>
If atoms have `needs_cov: true`, offer to run `/verify` on them.
\</follow\_up\>
