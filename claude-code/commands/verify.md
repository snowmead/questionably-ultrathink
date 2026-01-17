---
name: verify
description: Verify factual claims in a response using Chain of Verification
allowed-tools: [Task, AskUserQuestion, Read]
---

# /verify Command

Verify factual claims using Chain of Verification.

<steps>
## Execution Steps

1. **Identify what to verify:**
   - The most recent response (default)
   - A specific statement the user provides
   - Specific claims the user highlights

2. **Invoke the chain-of-verification agent:**
   ```
   Task tool:
   - subagent_type: "questionably-ultrathink:chain-of-verification"
   - prompt: "Verify these claims: {content to verify}"
   ```

3. **Present results** showing:
   - List of claims checked
   - Verification status for each (✓ VERIFIED / ⚠️ INCONSISTENT / ❓ UNCERTAIN)
   - Any corrections needed
   - Overall confidence assessment
</steps>

<follow_up>
If inconsistencies are found, present the corrected information clearly and offer to regenerate the response with corrections applied.
</follow_up>
