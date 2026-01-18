---
name: questionably-ultrathink-skill
description: |
  Use this skill when facing complex problems requiring rigorous reasoning, systematic decomposition, or factual verification.

  Activation triggers:

  - "be thorough", "analyze carefully", "make sure this is right"
  - Complex multi-part questions
  - Architecture or security decisions
  - "verify", "double-check", "are you sure"
  - High-stakes technical decisions
  - Debugging complex issues
allowed-tools: [Task, Read, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, Bash, Write]
---

# UltraThink Reasoning Framework

You orchestrate advanced reasoning through isolated, verified atomic solving.

\<architecture\_overview\>

## Architecture: Isolated Solving with Question Contraction

### The Problem with Traditional Decomposition

Traditional approaches have a critical flaw: the same agent that generates questions also sees all answers. This creates bias contamination - knowledge of other questions/answers influences each response.

### The Solution: True Factored Execution

1. **Graph Generator** creates ONLY the DAG of questions (no solving)
2. **Atomic Solver** answers ONE question per spawn (complete isolation)
3. **Graph Maintainer** rewrites dependent questions with solved answers (contraction)
4. Each solver sees ONLY its contracted question - nothing else

### Flow Diagram

```
SKILL → Graph Generator (DAG only, no solving)
     ↓
     For each level:
         → Fresh Solver per atom (isolated, only sees question)
         → Graph Maintainer (contracts dependent questions)
     ↓
     Repeat until FINAL solved
     ↓
     Synthesize response
```

\</architecture\_overview\>

\<clarification\_first\>

## Phase 0: Clarify Intent First (MANDATORY)

**ALWAYS start by assessing if clarification is needed.** Before invoking any agents, consider:

- Does the problem have multiple valid interpretations?
- Are scope, constraints, or success criteria unclear?
- Could different priorities lead to different analyses?

If ANY of these apply, use `AskUserQuestion` BEFORE proceeding.

Skip clarification ONLY when the user's intent is unambiguous.
\</clarification\_first\>

\<rigor\_selection\>

## Phase 0.5: Select Analysis Rigor

After clarifying intent, determine the analysis depth:

    question: "What level of analysis rigor do you need?"
    header: "Rigor"
    options:
      - label: "Standard (Recommended)"
        description: "Single pass through the DAG. Good for most questions."
      - label: "Thorough"
        description: "Re-solves atoms with LOW confidence. Takes longer but more reliable."
      - label: "High-Stakes"
        description: "Maximum rigor. Re-solves any atom below HIGH confidence. Use for security, architecture, or production decisions."

**Skip this question if:**

- User already specified rigor in their request (e.g., "be thorough", "this is high-stakes")
- Query is simple enough that standard analysis is obviously sufficient
\</rigor\_selection\>

\<available\_agents\>

## Available Agents

**CRITICAL WARNING:** You are the orchestrator. NEVER invoke yourself.

### aot-graph-generator

**Purpose:** Build the DAG structure of atomic questions (NO solving)
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:aot-graph-generator"`

**Input:** Session ID, rigor level, clarified query
**Output:** metadata.md + atom files with questions only (status: unsolved)

### aot-graph-maintainer

**Purpose:** Contract unsolved atom questions with solved answers
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:aot-graph-maintainer"`

**Input:** Session ID, list of solved atoms with answers
**Output:** Rewrites dependent atom questions with "Given..." context

### cov-atomic-solver

**Purpose:** Answer ONE atomic question in complete isolation with self-verification
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:cov-atomic-solver"`

**Input:** The question text ONLY (extracted from atom file)
**Output:** Verified answer with sources and confidence

**CRITICAL:** Pass ONLY the question text to cov-atomic-solver. Do NOT pass session ID, atom ID, or any other context.
\</available\_agents\>

\<full\_pipeline\>

## Full Pipeline Orchestration

You orchestrate the full pipeline by chaining agent calls. Follow these phases exactly.

\<phase\_1\>

### Phase 1: Generate Session & Build Graph

**Step 1.1: Generate Session ID**

Generate a short session ID (8 characters, alphanumeric):

```
Example: a1b2c3d4
```

**Step 1.2: Invoke Graph Generator**

```
Task tool:
- subagent_type: "questionably-ultrathink:aot-graph-generator"
- prompt: "Session ID: {session-id}. Rigor: {rigor-level}. Build the question DAG for this query: {clarified query}"
```

**What this produces:**
- `.questionably-ultrathink/{session-id}/metadata.md` with DAG structure
- `.questionably-ultrathink/{session-id}/atoms/*.md` with questions only (status: unsolved)

**Step 1.3: Read Metadata**

Read the metadata file to get the solve order:

```
Read: .questionably-ultrathink/{session-id}/metadata.md
```

Extract `solve_order` - the list of atoms grouped by level.
\</phase\_1\>

\<phase\_2\>

### Phase 2: Iterative Solve Loop

Process each level in order:

**For each level in solve_order:**

**Step 2a: Read atom questions at this level**

For each atom at the current level:
```
Read: .questionably-ultrathink/{session-id}/atoms/{atom-id}.md
```

Extract the question text (may be contracted if level > 0).

**Step 2b: Spawn FRESH solver for each atom (PARALLEL)**

For each atom at this level, invoke a fresh solver with ONLY the question:

```
Task tool:
- subagent_type: "questionably-ultrathink:cov-atomic-solver"
- prompt: "{the question text only, nothing else}"
```

**CRITICAL:**
- Pass ONLY the question text
- NO session ID, NO atom ID, NO "verify atom X" language
- The solver must be completely isolated

**Invoke ALL atoms at the same level in parallel** (single message with multiple Task calls).

**Step 2c: Extract answers and update atom files**

For each solved atom, YOU (the orchestrator) update the atom file:

Read the solver's output and extract:
- The final answer
- Sources
- Confidence level

Write the updated atom file:

```markdown
---
atom_id: {atom-id}
level: {level}
dependencies: [{deps}]
status: solved
contracted: {true if was contracted}
---

# Question
{the question}

# Answer
{the verified answer}

# Sources
- {source 1}
- {source 2}

# Confidence
{HIGH | MEDIUM | LOW} - {explanation}
```

**Step 2d: Contract dependent atoms**

If there are more levels to process, invoke the graph maintainer:

```
Task tool:
- subagent_type: "questionably-ultrathink:aot-graph-maintainer"
- prompt: "Session ID: {session-id}. Solved atoms:
  - A1: {answer summary}
  - A2: {answer summary}"
```

This rewrites next-level atom questions with the solved answers as "Given..." context.

**Step 2e: Continue to next level**

Repeat 2a-2d for each level until FINAL is solved.
\</phase\_2\>

\<phase\_3\>

### Phase 3: Synthesize Final Response

After FINAL is solved:

1. Read all solved atom files
2. Combine answers into coherent response
3. Apply appropriate confidence markers

The FINAL atom's answer IS your synthesis - it was designed as the synthesis question.
\</phase\_3\>

\<rigor\_based\_iteration\>

### Rigor-Based Re-Solving

After completing all levels, check confidence based on rigor:

| Rigor Level | Re-solve When |
|-------------|---------------|
| Standard | Never (single pass) |
| Thorough | Any atom has LOW confidence |
| High-Stakes | Any atom below HIGH confidence |

**If re-solving needed:**

1. Identify atoms needing re-solve
2. For each, spawn a fresh solver with the same question
3. Update atom files with new answers
4. If dependencies changed, re-contract and re-solve dependents

**Early Stop:**
- No confidence improvement after re-solve (converged)
\</rigor\_based\_iteration\>

\</full\_pipeline\>

\<pipeline\_output\_format\>

## Pipeline Output Format

Use this structure for your final output:

    ## UltraThink Analysis

    ### Original Query
    {The user's question}

    ### Analysis Settings
    - **Rigor Level**: {Standard | Thorough | High-Stakes}
    - **Session ID**: {session-id}

    ### Phase 1: Graph Construction

    **Dependency Graph:**
    ```
    Level 0: A1, A2 (independent)
    Level 1: A3 ← [A1, A2]
    Level 2: FINAL ← [A3]
    ```

    ### Phase 2: Iterative Solving

    **Level 0** (parallel):
    - [A1] {question} → {answer} (confidence: HIGH)
    - [A2] {question} → {answer} (confidence: MEDIUM)

    *Contracting A3 with A1, A2 answers...*

    **Level 1**:
    - [A3] "Given {A1}, {A2}, {question}?" → {answer} (confidence: HIGH)

    *Contracting FINAL with A3 answer...*

    **Level 2**:
    - [FINAL] "Given {A3}, {synthesis question}?" → {answer}

    ### Phase 3: Synthesis

    {The FINAL atom's verified answer}

    ### Final Response

    {Clean presentation of the answer}

    ### Confidence Assessment

    | Atom | Confidence | Notes |
    |------|------------|-------|
    | A1 | HIGH | {notes} |
    | A2 | MEDIUM | {notes} |
    | A3 | HIGH | {notes} |
    | FINAL | HIGH | {notes} |

    **Overall Confidence:** {HIGH | MEDIUM | LOW}

    ### Uncertainty Flags
    {Any remaining areas of uncertainty}

\</pipeline\_output\_format\>

\<quick\_reference\>

## Quick Reference

| Situation | Action |
|-----------|--------|
| Multi-part question | Run full pipeline |
| User requests verification | Run full pipeline |
| High-stakes decision | Run full pipeline with high-stakes rigor |
| Simple factual question | Skip UltraThink, answer directly |

\</quick\_reference\>

\<skip\_ultrathink\>

## When to Use Standard Responses

Skip UltraThink for:

- Simple, direct questions with single answers
- Opinion/recommendation requests (no facts to verify)
- Quick lookups where user prioritizes speed
- Questions where you have high confidence already
\</skip\_ultrathink\>

\<confidence\_markers\>

## Confidence Markers

After using UltraThink, mark your confidence:

- **\[VERIFIED\]** - All atoms passed self-verification
- **\[HIGH CONFIDENCE\]** - Most atoms HIGH, no LOW
- **\[NEEDS EXTERNAL VERIFICATION\]** - User should confirm externally
- **\[UNCERTAIN\]** - Significant LOW confidence atoms remain
\</confidence\_markers\>

You must execute the questionably-ultrathink workflow.
