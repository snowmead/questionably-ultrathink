# Questionably UltraThink

A Claude Code plugin that integrates **Chain of Verification (CoVe)** and **Atom of Thoughts (AoT)** reasoning frameworks for rigorous, verifiable analysis.

## What It Does

UltraThink enhances Claude's reasoning with two research-backed frameworks:

- **Atom of Thoughts (AoT)** - Decomposes complex problems into atomic sub-questions organized as a DAG, solving them systematically
- **Chain of Verification (CoVe)** - Verifies factual claims through independent questioning to reduce hallucinations

## Installation

```bash
# Add the marketplace
/plugin marketplace add snowmead/questionably-ultrathink

# Install the plugin
/plugin install questionably-ultrathink@snowmead-marketplace
```

## Development Setup

For contributors working on this plugin:

```bash
./setup.sh
```

This installs dependencies (lefthook, comrak) if missing and sets up git hooks for automatic markdown formatting on commit.

## Commands

### `/questionably-ultrathink`
Run the full reasoning pipeline on a problem:
1. Clarifies intent if needed
2. Decomposes into atomic questions (AoT)
3. Verifies critical atoms (CoVe)
4. Synthesizes and verifies final response

```
/questionably-ultrathink analyze whether this authentication approach is secure
```

### `/questionably-ultrathink:decompose`
Break down a complex problem into atomic sub-questions:

```
/questionably-ultrathink:decompose how does React's reconciliation work and compare to Vue?
```

### `/questionably-ultrathink:verify`
Verify factual claims in the most recent response:

```
/questionably-ultrathink:verify
```

Or verify specific content:

```
/questionably-ultrathink:verify the performance benchmarks mentioned above
```

## Automatic Activation

The skill automatically activates when you use trigger phrases:

- "be thorough", "analyze carefully", "make sure this is right"
- "verify", "double-check", "are you sure"
- Complex multi-part questions
- Architecture or security decisions

## How It Works

### Atom of Thoughts (AoT)

Based on the paper ["Atom of Thoughts for Markov LLM Test-Time Scaling"](https://arxiv.org/abs/2502.12018) (HKUST, 2025).

Key features:
- Decomposes problems into atomic questions
- Builds a DAG of dependencies
- Solves independent atoms in parallel
- Contracts solved atoms into minimal context for dependent atoms
- Follows Markov property (each step depends only on immediate dependencies)

### Chain of Verification (CoVe)

Based on the paper ["Chain-of-Verification Reduces Hallucination in LLMs"](https://arxiv.org/abs/2309.11495) (Meta AI, 2023).

Key features:
- Extracts verifiable factual claims
- Generates targeted verification questions
- Answers each question **independently** (factored execution)
- Compares independent answers to original claims
- Reports inconsistencies with corrections

## Output Format

### AoT Decomposition
```
## Atom of Thoughts Decomposition

### Dependency Graph
- [A1] What auth standard fits a stateless API? (independent)
- [A2] Where should tokens be validated? (independent)
- [A3] How should tokens be stored client-side? (depends: A1)
- [FINAL] Complete auth approach recommendation (depends: A2, A3)

### Solutions
[A1] JWT - stateless, self-contained, widely supported
[A2] Middleware layer before route handlers
...
```

### CoVe Report
```
## Chain of Verification Report

### Verification Results

**Claim 1:** "React was released in 2013"
- Verification Q: When was React first publicly released?
- Independent Answer: React was released in May 2013 at JSConf US
- Status: ✓ VERIFIED

**Claim 2:** "Virtual DOM was invented by React"
- Verification Q: Who invented the virtual DOM concept?
- Independent Answer: While React popularized it, similar concepts existed earlier
- Status: ⚠️ INCONSISTENT
```

## Confidence Markers

After using UltraThink, responses are marked:

- **[VERIFIED]** - Passed CoVe verification
- **[HIGH CONFIDENCE]** - Decomposed and analyzed systematically
- **[NEEDS EXTERNAL VERIFICATION]** - User should confirm externally
- **[UNCERTAIN]** - Flagged areas of doubt remain

## When NOT to Use

Skip UltraThink for:
- Simple, direct questions
- Opinion or recommendation requests
- Quick lookups where speed matters
- Questions you already have high confidence in

## License

MIT

## References

- [Chain-of-Verification Paper](https://arxiv.org/abs/2309.11495) - Meta AI, 2023
- [Atom of Thoughts Paper](https://arxiv.org/abs/2502.12018) - HKUST, 2025
- [CoVe Implementation](https://github.com/ritun16/chain-of-verification)
- [AoT Implementation](https://github.com/qixucen/atom)
