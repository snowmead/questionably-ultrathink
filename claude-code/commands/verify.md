---
name: verify
description: Verify a factual claim or answer a question with self-verification using the atomic solver
allowed-tools: [Task, AskUserQuestion, Read]
---

# /verify Command

Verify a factual claim or answer a question with built-in self-verification.

<steps>
## Execution Steps

1. **Identify what to verify:**
   - A specific statement the user provides
   - The most recent claim or answer
   - A question the user wants answered with verification

2. **Formulate as an atomic question:**
   - If the user provided a claim, convert to a verification question
   - If already a question, use as-is
   - Ensure the question is self-contained and atomic

3. **Invoke the cove-atomic-solver agent:**

       Task tool:
       - subagent_type: "questionably-ultrathink:cove-atomic-solver"
       - prompt: "{the question or claim to verify}"

   **IMPORTANT:** Pass ONLY the question/claim text. No additional context.

4. **Present results** showing:
   - The verified answer
   - Self-verification results (claims checked, status for each)
   - Sources consulted
   - Overall confidence assessment
</steps>

<examples>
## Example Usage

**Verify a claim:**
User: "/verify React was released in 2013"
→ Invoke solver with: "When was React first publicly released?"

**Answer with verification:**
User: "/verify What is Redis's per-key memory overhead?"
→ Invoke solver with: "What is Redis's per-key memory overhead?"
</examples>

<follow_up>
If verification finds discrepancies or low confidence:
- Present the corrected/verified information clearly
- Offer to re-verify with additional sources if needed
</follow_up>
