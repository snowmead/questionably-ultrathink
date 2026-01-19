---
name: questionably-ultrathink-skill
description: |
  Use this skill when facing complex problems requiring rigorous reasoning, systematic decomposition, or factual verification.

  Activation triggers:

  * "be thorough", "analyze carefully", "make sure this is right"
  * Complex multi-part questions
  * Architecture or security decisions
  * "verify", "double-check", "are you sure"
  * High-stakes technical decisions
  * Debugging complex issues
allowed-tools: [Task, Read, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, Bash, Write]
---

# UltraThink Reasoning Framework

You orchestrate advanced reasoning through isolated, verified atomic solving.

\<architecture\_overview>

## Architecture: Isolated Solving with Factored Verification

### The Problem with Traditional Decomposition

Traditional approaches have a critical flaw: the same agent that generates questions also sees all answers. This creates bias contamination - knowledge of other questions/answers influences each response.

### The Solution: True Factored Execution

1. **Graph Generator** creates ONLY the DAG of questions (no solving)
2. **Atomic Solver** answers ONE question per spawn, extracts claims, generates verification questions (but does NOT answer them)
3. **Verifiers** answer verification questions in COMPLETE ISOLATION (no context about claims)
4. **Verification Maintainer** cross-checks claims vs verifier answers, updates atom file
5. **Graph Maintainer** rewrites dependent questions with solved answers (contraction)

### Factored Verification Flow (Per Atom)

```
ORCHESTRATOR (you)
    │
    ├─(1)─► cov-atomic-solver
    │           │
    │           └──► writes atom file (answer + claims + verification Qs)
    │
    ├─(2)─► reads atom file, extracts verification Qs
    │
    ├─(3)─► cov-verifier #1 ──► returns: answer for Q1
    ├─(3)─► cov-verifier #2 ──► returns: answer for Q2  (PARALLEL)
    ├─(3)─► cov-verifier #N ──► returns: answer for QN
    │
    └─(4)─► cov-verification-maintainer
                │  Input: atom path + all verifier responses
                │
                └──► updates atom file (verification trace + final answer)
```

**Key Principle:** You (the orchestrator) control ALL agent spawning. Agents receive inputs and return outputs - they don't spawn other agents.

\</architecture\_overview>

\<background\_execution>

## Background Execution for Pipeline Parallelism

You can run subagents in the background to advance multiple independent paths simultaneously instead of waiting sequentially. This dramatically improves throughput when processing multiple atoms.

### When to Use Background Execution

Use `run_in_background: true` in Task tool calls when:

* Multiple atoms at the same level need verification independently
* Verification for one atom doesn't depend on another atom's verification
* You want to start the next atom's pipeline while waiting on verifier responses

### Pattern: Parallel Pipeline Advancement

Instead of waiting for ALL verifiers to complete before moving to the next atom:

```
SEQUENTIAL (slow):
A1: solver → verifiers → wait → maintainer → done
A2: solver → verifiers → wait → maintainer → done
```

Use background execution for pipeline parallelism:

```
PARALLEL PIPELINE (fast):
A1: solver → verifiers (background)
A2: solver → verifiers (background)
A1: check verifiers → maintainer (when ready)
A2: check verifiers → maintainer (when ready)
```

### How to Use Background Execution

**Step 1: Spawn verifiers in background**

```
Task tool:
- subagent_type: "questionably-ultrathink:cov-verifier"
- prompt: "{verification question}"
- run_in_background: true
```

This returns immediately with an `output_file` path and task ID.

**Step 2: Continue to next atom**

While verifiers run in background, spawn the next atom's solver and verifiers.

**Step 3: Check on background tasks**

Use `TaskOutput` tool or `Read` the output file to check if background tasks completed:

```
TaskOutput tool:
- task_id: "{task_id}"
- block: false  # Non-blocking check
```

Or read the output file directly to see results.

**Step 4: Process completed verification**

Once an atom's verifiers complete, spawn its verification maintainer. You can do this while other atoms' verifiers are still running.

### Example: Level 0 with A1 and A2

```
1. Spawn cov-atomic-solver for A1 and A2 (parallel, blocking)
2. Write initial atom files with solver output

3. Parse verification Qs from A1 → spawn N verifiers (run_in_background: true)
4. Parse verification Qs from A2 → spawn N verifiers (run_in_background: true)

5. Check A1 verifiers (TaskOutput, block: false)
   - If complete → spawn A1's cov-verification-maintainer
   - If not → continue

6. Check A2 verifiers (TaskOutput, block: false)
   - If complete → spawn A2's cov-verification-maintainer
   - If not → continue

7. Repeat checks until all maintainers have run
8. Proceed to contract and next level
```

### Guidelines

* **Solvers can run in parallel but should block** - You need their output immediately to parse verification questions
* **Verifiers should run in background** - They're independent and you can advance other atoms while waiting
* **Maintainers should block** - You need the updated atom file before contracting
* **Track task IDs** - Keep a list of background task IDs so you can check on them
* **Balance parallelism** - Don't spawn too many background tasks; group by atom for manageable tracking

\</background\_execution>

\<clarification\_first>

## Phase 0: Clarify Intent First (MANDATORY)

**ALWAYS start by assessing if clarification is needed.** Before invoking any agents, consider:

* Does the problem have multiple valid interpretations?
* Are scope, constraints, or success criteria unclear?
* Could different priorities lead to different analyses?

If ANY of these apply, use `AskUserQuestion` BEFORE proceeding.

Skip clarification ONLY when the user's intent is unambiguous.
\</clarification\_first>

\<rigor\_selection>

## Phase 0.5: Select Analysis Rigor

After clarifying intent, determine the analysis depth:

```
question: "What level of analysis rigor do you need?"
header: "Rigor"
options:
  - label: "Standard (Recommended)"
    description: "Single pass through the DAG. Good for most questions."
  - label: "Thorough"
    description: "Re-solves atoms with LOW confidence. Takes longer but more reliable."
  - label: "High-Stakes"
    description: "Maximum rigor. Re-solves any atom below HIGH confidence. Use for security, architecture, or production decisions."
```

**Skip this question if:**

* User already specified rigor in their request (e.g., "be thorough", "this is high-stakes")
* Query is simple enough that standard analysis is obviously sufficient
  \</rigor\_selection>

\<available\_agents>

## Available Agents

**CRITICAL WARNING:** You are the orchestrator. NEVER invoke yourself. Only YOU can spawn agents via the Task tool.

### aot-graph-generator

**Purpose:** Build the DAG structure of atomic questions (NO solving)
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:aot-graph-generator"`

**Input:** Session ID, rigor level, clarified query
**Output:** metadata.md + atom files with questions only (status: unsolved)

### cov-atomic-solver

**Purpose:** Answer ONE atomic question in complete isolation; extract claims and generate verification questions (but NOT answer them)
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:cov-atomic-solver"`

**Input:** The question text ONLY (extracted from atom file)
**Output:** Answer + claims + verification questions (with VERIFICATION\_START/END markers)

**CRITICAL:** Pass ONLY the question text to cov-atomic-solver. Do NOT pass session ID, atom ID, or any other context.

### cov-verifier

**Purpose:** Answer ONE verification question in complete isolation (no context about the claim being verified)
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:cov-verifier"`

**Input:** The verification question text ONLY (no claim, no original answer)
**Output:** Answer + confidence + sources

**CRITICAL:** Pass ONLY the verification question. The verifier must have ZERO context about what claim is being verified. This is the key to factored verification.

### cov-verification-maintainer

**Purpose:** Cross-check claims against independent verifier answers; update atom file with verification trace
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:cov-verification-maintainer"`

**Input:** Atom file path + verifier responses (claim, question, independent answer for each)
**Output:** Updates atom file with full verification trace and revised answer

**CRITICAL:** This agent does NOT spawn verifiers. You (the orchestrator) already spawned them and collected their responses. You pass those responses to this agent.

### aot-graph-maintainer

**Purpose:** Contract unsolved atom questions with solved answers
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:aot-graph-maintainer"`

**Input:** Session ID, list of solved atoms with answers
**Output:** Rewrites dependent atom questions with "Given..." context

### aot-judge (Optional - High-Stakes Only)

**Purpose:** Evaluate answer quality across atoms at a level (coherence, contradictions, completeness)
**Invoke:** `Task` tool with `subagent_type: "questionably-ultrathink:aot-judge"`

**Input:** Session ID, level number, list of solved atoms to evaluate
**Output:** Evaluation report with specific atoms flagged for re-solve (if issues found)

**Use when:**

* Rigor level is High-Stakes
* After solving all atoms at a level
* When you want additional quality assurance beyond factored verification
\</available\_agents>

\<full\_pipeline>

## Full Pipeline Orchestration

You orchestrate the full pipeline by chaining agent calls. Follow these phases exactly.

\<phase\_1>

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

* `.questionably-ultrathink/{session-id}/metadata.md` with DAG structure
* `.questionably-ultrathink/{session-id}/atoms/*.md` with questions only (status: unsolved)

**Step 1.3: Read Metadata**

Read the metadata file to get the solve order:

```
Read: .questionably-ultrathink/{session-id}/metadata.md
```

Extract `solve_order` - the list of atoms grouped by level.
\</phase\_1>

\<phase\_2>

### Phase 2: Iterative Solve Loop with Factored Verification

Process each level in order:

**For each level in solve\_order:**

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

* Pass ONLY the question text
* NO session ID, NO atom ID, NO "verify atom X" language
* The solver must be completely isolated

**Invoke ALL atoms at the same level in parallel** (single message with multiple Task calls).

**Step 2c: Extract solver output and write initial atom file**

For each solved atom, extract from the solver's output:

* The answer
* The claims + verification questions (between VERIFICATION\_START/END markers)
* Sources
* Initial confidence

Write the initial atom file:

```markdown
---
atom_id: {atom-id}
level: {level}
dependencies: [{deps}]
status: pending_verification
contracted: {true if was contracted}
solved_at: {ISO timestamp}
solve_attempts: 1
confidence_score: {initial confidence}
---

# Question
{the question}

# Answer
{the answer from solver}

# Verification Questions
<!-- VERIFICATION_START -->
1. CLAIM: "{claim}" | QUESTION: "{verification question}"
2. CLAIM: "{claim}" | QUESTION: "{verification question}"
<!-- VERIFICATION_END -->

# Sources
{sources}

# Confidence
{initial confidence}
```

**Step 2d: Parse verification questions**

Extract claims and questions from between the VERIFICATION\_START/END markers:

```
Pattern: CLAIM: "{claim}" | QUESTION: "{question}"
```

Build a list of (claim, question) pairs.

**Step 2e: Spawn ISOLATED verifiers for each verification question (PARALLEL or BACKGROUND)**

For each (claim, question) pair, spawn a fresh verifier with ONLY the question:

```
Task tool:
- subagent_type: "questionably-ultrathink:cov-verifier"
- prompt: "{the verification question text only, nothing else}"
- run_in_background: true  # Optional: enables pipeline parallelism
```

**CRITICAL:**

* Pass ONLY the verification question
* NO claim text, NO original answer, NO context
* The verifier must have ZERO knowledge of what's being verified
* This is what makes it "factored" verification

**Parallelization options:**

1. **Parallel within atom (blocking):** Invoke ALL verifiers for one atom in parallel (single message with multiple Task calls). Wait for completion before moving to next atom.

2. **Background for pipeline parallelism (recommended):** Spawn verifiers with `run_in_background: true`. This lets you immediately start the next atom's verification while the first atom's verifiers run. Check on background tasks with `TaskOutput` (block: false) and spawn maintainers as each atom's verifiers complete. See `<background_execution>` section for details.

**Step 2f: Collect verifier responses**

**For blocking calls:** Extract directly from Task tool responses.

**For background calls:** Use `TaskOutput` tool to retrieve results:

```
TaskOutput tool:
- task_id: "{task_id from background spawn}"
- block: true   # Wait for completion
- timeout: 30000  # 30 second timeout
```

Or use `block: false` to check without waiting (for pipeline advancement).

For each verifier response, extract:

* ANSWER: {the independent answer}
* CONFIDENCE: {HIGH | MEDIUM | LOW}
* SOURCES: {sources used}

Build a structured list:

```
VERIFIER RESPONSES:
1. CLAIM: "{original claim from solver}"
   QUESTION: "{the verification question}"
   INDEPENDENT ANSWER: "{answer from verifier}"
   CONFIDENCE: {verifier's confidence}
   SOURCES: {verifier's sources}

2. CLAIM: ...
```

**With background execution:** Collect responses for each atom as its verifiers complete. You don't need to wait for all atoms' verifiers before processing the first atom's maintainer.

**Step 2g: Spawn verification maintainer to cross-check and update atom file**

```
Task tool:
- subagent_type: "questionably-ultrathink:cov-verification-maintainer"
- prompt: |
    Atom file path: .questionably-ultrathink/{session-id}/atoms/{atom-id}.md

    VERIFIER RESPONSES:
    1. CLAIM: "{claim}"
       QUESTION: "{question}"
       INDEPENDENT ANSWER: "{verifier answer}"
       CONFIDENCE: {confidence}
       SOURCES: {sources}

    2. CLAIM: ...

    Cross-check each claim against its independent verification answer. Update the atom file with the full verification trace.
```

The maintainer will:

* Read the atom file
* Compare each claim to its verification answer
* Mark claims as VERIFIED, REVISED, REFUTED, or UNCERTAIN
* Update the answer if any claims were revised/refuted
* Write the full verification trace to the atom file
* Update the confidence score

**Step 2h: Contract dependent atoms**

If there are more levels to process, invoke the graph maintainer:

```
Task tool:
- subagent_type: "questionably-ultrathink:aot-graph-maintainer"
- prompt: "Session ID: {session-id}. Solved atoms:
  - A1: {answer summary}
  - A2: {answer summary}"
```

This rewrites next-level atom questions with the solved answers as "Given..." context.

**Step 2i: Continue to next level**

Repeat 2a-2h for each level until FINAL is solved.
\</phase\_2>

\<phase\_3>

### Phase 3: Synthesize Final Response

After FINAL is solved:

1. Read all solved atom files
2. Combine answers into coherent response
3. Apply appropriate confidence markers

The FINAL atom's answer IS your synthesis - it was designed as the synthesis question.
\</phase\_3>

\<rigor\_based\_iteration>

### Rigor-Based Re-Solving

After completing all levels, check confidence based on rigor:

| Rigor Level | Re-solve When | Confidence Threshold |
|-------------|---------------|---------------------|
| Standard | Never (single pass) | N/A |
| Thorough | Any atom has LOW confidence | score < 0.4 |
| High-Stakes | Any atom below HIGH confidence | score < 0.7 |

**Confidence Score Mapping:**

* 0.0 - 0.4 = LOW
* 0.4 - 0.7 = MEDIUM
* 0.7 - 1.0 = HIGH

**Status Lifecycle:**

```
unsolved → pending_verification → solved → (needs_re_solve → pending_verification → solved) → verified
```

1. `unsolved` - Initial state from graph generator
2. `pending_verification` - Solver completed, awaiting factored verification
3. `solved` - Verification maintainer completed
4. `needs_re_solve` - Confidence below threshold for rigor level
5. `verified` - Passed rigor check (final state)

**If re-solving needed:**

1. Mark atoms needing re-solve with `status: needs_re_solve`
2. Increment `solve_attempts` counter
3. For each, spawn a fresh solver with the same question
4. Run the full factored verification pipeline again
5. If dependencies changed, re-contract and re-solve dependents

**Early Stop Conditions:**

* No confidence improvement after re-solve (converged)
* `solve_attempts` reaches 3 (prevent infinite loops)

**For High-Stakes rigor (optional judge step):**

After solving all atoms at a level, you MAY invoke the optional judge agent:

```
Task tool:
- subagent_type: "questionably-ultrathink:aot-judge"
- prompt: "Session ID: {session-id}. Level: {level}. Evaluate answers for coherence, contradictions, and completeness."
```

The judge evaluates answer quality without re-answering. If issues found, mark specific atoms for re-solve with judge feedback.
\</rigor\_based\_iteration>

\</full\_pipeline>

\<pipeline\_output\_format>

## Pipeline Output Format

Use this structure for your final output:

````
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

### Phase 2: Iterative Solving with Factored Verification

**Level 0** (parallel):
- [A1] {question}
  - Initial answer: {answer}
  - Verification: {N claims verified, M revised}
  - Final confidence: HIGH

- [A2] {question}
  - Initial answer: {answer}
  - Verification: {N claims verified}
  - Final confidence: MEDIUM

*Contracting A3 with A1, A2 answers...*

**Level 1**:
- [A3] "Given {A1}, {A2}, {question}?"
  - Initial answer: {answer}
  - Verification: {N claims verified}
  - Final confidence: HIGH

*Contracting FINAL with A3 answer...*

**Level 2**:
- [FINAL] "Given {A3}, {synthesis question}?"
  - Final answer: {answer}

### Phase 3: Synthesis

{The FINAL atom's verified answer}

### Final Response

{Clean presentation of the answer}

### Confidence Assessment

| Atom | Initial | After Verification | Notes |
|------|---------|-------------------|-------|
| A1 | 0.75 | 0.90 | All claims verified |
| A2 | 0.60 | 0.55 | 1 claim revised |
| A3 | 0.80 | 0.85 | All claims verified |
| FINAL | 0.85 | 0.85 | All claims verified |

**Overall Confidence:** {HIGH | MEDIUM | LOW}

### Uncertainty Flags
{Any remaining areas of uncertainty}
````

\</pipeline\_output\_format>

\<quick\_reference>

## Quick Reference

| Situation | Action |
|-----------|--------|
| Multi-part question | Run full pipeline |
| User requests verification | Run full pipeline |
| High-stakes decision | Run full pipeline with high-stakes rigor |
| Simple factual question | Skip UltraThink, answer directly |

\</quick\_reference>

\<skip\_ultrathink>

## When to Use Standard Responses

Skip UltraThink for:

* Simple, direct questions with single answers
* Opinion/recommendation requests (no facts to verify)
* Quick lookups where user prioritizes speed
* Questions where you have high confidence already
  \</skip\_ultrathink>

\<confidence\_markers>

## Confidence Markers

After using UltraThink, mark your confidence:

* **\[VERIFIED]** - All atoms passed factored verification, all claims verified
* **\[HIGH CONFIDENCE]** - Most atoms HIGH, no LOW, minor revisions only
* **\[NEEDS EXTERNAL VERIFICATION]** - User should confirm externally
* **\[UNCERTAIN]** - Significant LOW confidence atoms or many revised claims
  \</confidence\_markers>

You must execute the questionably-ultrathink workflow.
