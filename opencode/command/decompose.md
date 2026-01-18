---
description: Decompose a complex problem into atomic sub-questions using Atom of Thoughts Graph Generator
---

# /decompose Command

Decompose the specified problem into atomic sub-questions (graph construction only, no solving).

<steps>
## Execution Steps

1. **Identify the problem** from context or ask the user for clarification

2. **Generate a session ID** (8 alphanumeric characters)

3. **Invoke the aot-graph-generator agent:**

       Task:
       - @aot-graph-generator
       - prompt: "Session ID: {session-id}. Rigor: standard. Build the question DAG for this query: {problem statement}"

4. **Present results** showing:

   - The atom dependency graph with levels
   - The questions at each level (NO answers - this is graph construction only)
   - The solve order for processing
   - Files created in `.questionably-ultrathink/{session-id}/`

</steps>

\<follow\_up\>
After decomposition, offer to:
- Run `/questionably-ultrathink` to solve all atoms with verification
- Manually solve individual atoms for exploration
\</follow\_up\>
