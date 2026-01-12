---
name: questionably-ultrathink
description: |
  Use this skill when facing complex problems requiring rigorous reasoning, systematic decomposition, or factual verification.

  Activation triggers:
  - "be thorough", "analyze carefully", "make sure this is right"
  - Complex multi-part questions
  - Architecture or security decisions
  - "verify", "double-check", "are you sure"
  - High-stakes technical decisions
  - Debugging complex issues
hooks:
  - matcher: "Stop"
    type: "prompt"
    prompt: |
      Before finalizing, check these criteria:
      1. Does the response contain specific factual claims (dates, numbers, technical details) that were not verified?
      2. Was the problem complex (3+ parts) but handled without decomposition?
      3. Is this a high-stakes domain (security, architecture, production) where errors would be costly?

      If ANY criterion is true, recommend verification before completing.
      Return JSON: {"decision": "allow", "reason": "..."} or {"decision": "block", "reason": "Recommend running chain-of-verification on [specific claims]"}
allowed-tools: [Task, Read, Grep, Glob, WebSearch, WebFetch, AskUserQuestion]
---

# UltraThink Reasoning Framework

You now have access to advanced reasoning agents for rigorous analysis. Use them when problems require more than surface-level analysis.

<clarification_first>
## Step 0: Clarify Intent First (MANDATORY)

**ALWAYS start by assessing if clarification is needed.** Before invoking any agents, consider:

- Does the problem have multiple valid interpretations?
- Are scope, constraints, or success criteria unclear?
- Could different priorities lead to different analyses?

If ANY of these apply, use `AskUserQuestion` BEFORE proceeding. Example:
```
"Before I analyze this, what aspects are most important to you?"
Options:
- Technical accuracy of implementation details
- Architectural soundness
- Security considerations
- All of the above (thorough review)
```

Skip clarification ONLY when the user's intent is unambiguous.
</clarification_first>

<available_agents>
## Available Agents

### atom-of-thoughts
**Purpose:** Decompose complex problems into atomic sub-questions
**Invoke:** `Task` tool with `subagent_type: "atom-of-thoughts"`

Use when:
- Questions have multiple parts requiring separate analysis
- Problems require synthesis from multiple domains
- Planning complex implementations
- Debugging issues with multiple potential causes

### chain-of-verification
**Purpose:** Verify factual claims to reduce hallucinations
**Invoke:** `Task` tool with `subagent_type: "chain-of-verification"`

Use when:
- Making specific factual claims (dates, numbers, technical details)
- User asks to double-check or verify something
- You have low confidence in accuracy
- Stakes are high and errors would be costly
</available_agents>

<full_pipeline>
## Full Pipeline Orchestration

When maximum rigor is required, **you orchestrate the full pipeline directly** by chaining agent calls. You are the orchestrator—there is no separate orchestrator agent.

**Trigger full pipeline when:**
- User explicitly requests thorough analysis ("be thorough", "analyze carefully")
- High-stakes decisions (architecture, security, production systems)
- Complex problems requiring both decomposition AND verification

<pipeline_steps>
### Pipeline Execution Steps (ALL STEPS REQUIRED)

**Step 1: Clarify Intent** (see Step 0 above)

**Step 2: Decompose with AoT**
```
Invoke Task tool:
- subagent_type: "atom-of-thoughts"
- prompt: "Decompose this query into atomic sub-questions: {clarified query}"
```
**IMPORTANT:** Display the full atom dependency graph and solutions in your output under "Phase 1: Decomposition".

**Step 3: Verify Critical Atoms**
For atoms with factual claims or [NEEDS VERIFICATION] flag:
```
Invoke Task tool:
- subagent_type: "chain-of-verification"
- prompt: "Verify this atom solution: {atom question} → {atom answer}"
```
Run multiple CoVe agents in parallel for efficiency.

**Step 4: Synthesize**
Combine all atom solutions. Use corrected versions where CoVe found issues.
Display under "Phase 3: Synthesis".

**Step 5: Final Verification (MANDATORY)**
```
Invoke Task tool:
- subagent_type: "chain-of-verification"
- prompt: "Verify this synthesized response: {synthesis}"
```
**DO NOT SKIP THIS STEP.** The final response must be verified.
Display under "Phase 4: Final Verification".
</pipeline_steps>

<pipeline_output_format>
### Pipeline Output Format (FOLLOW EXACTLY)

**You MUST use this exact structure for your final output:**

```
## UltraThink Analysis

### Original Query
{The user's question}

### Phase 1: Decomposition (AoT)

{Summary from atom-of-thoughts agent}

Atoms identified:
- [A1] {question} → {answer}
- [A2] {question} → {answer}
- ...

### Phase 2: Verification (CoVe)

Atoms verified:
- [A1] ✓ VERIFIED
- [A2] ⚠️ CORRECTED: {original} → {corrected}
- [A3] ✓ VERIFIED
- ...

### Phase 3: Synthesis

{Combined response using verified/corrected atoms}

### Phase 4: Final Verification

{CoVe summary of synthesized response}
- Claims checked: N
- All verified: YES/NO
- Corrections applied: {if any}

### Final Response

{The verified, high-confidence answer}

### Confidence Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Decomposition Quality | HIGH/MED/LOW | {notes} |
| Factual Accuracy | HIGH/MED/LOW | {notes} |
| Synthesis Coherence | HIGH/MED/LOW | {notes} |
| Overall Confidence | HIGH/MED/LOW | {summary} |

### Uncertainty Flags
{Any remaining areas of uncertainty the user should be aware of}
```

**CRITICAL:** Do not deviate from this structure. All sections are required.
</pipeline_output_format>
</full_pipeline>

<quick_reference>
## Quick Reference

| Situation | Action |
|-----------|--------|
| Multi-part question ("How does X work and compare to Y?") | Invoke atom-of-thoughts |
| User requests verification ("Are you sure?") | Invoke chain-of-verification |
| User requests thorough analysis | Run full pipeline |
| Planning implementation | Invoke atom-of-thoughts |
| Verifying technical claims | Invoke chain-of-verification |
| Security/architecture decision | Run full pipeline |
</quick_reference>

<skip_ultrathink>
## When to Use Standard Responses

Use standard responses (skip UltraThink) for:
- Simple, direct questions with single answers
- Opinion/recommendation requests (no facts to verify)
- Quick lookups where user prioritizes speed
- Questions where you have high confidence already
</skip_ultrathink>

<confidence_markers>
## Confidence Markers

After using UltraThink agents, mark your confidence:

- **[VERIFIED]** - Passed CoVe verification
- **[HIGH CONFIDENCE]** - Decomposed and analyzed systematically
- **[NEEDS EXTERNAL VERIFICATION]** - User should confirm externally
- **[UNCERTAIN]** - Flagged areas of doubt remain
</confidence_markers>
