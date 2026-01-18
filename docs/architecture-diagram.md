# UltraThink Architecture: AoT + CoVe Combined

## Atom of Thoughts (AoT) — From the Paper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ATOM OF THOUGHTS (AoT)                               │
│                   arxiv.org/abs/2502.12018 (HKUST, 2025)                    │
└─────────────────────────────────────────────────────────────────────────────┘

CORE INSIGHT: Complex reasoning can be modeled as a MARKOV PROCESS where each
step depends ONLY on the current state — not accumulated history.

┌─────────────────────────────────────────────────────────────────────────────┐
│  TRADITIONAL CHAIN-OF-THOUGHT          │  ATOM OF THOUGHTS (MARKOV)        │
│                                         │                                   │
│   Q₀ → T₁ → T₂ → T₃ → ... → Tₙ → A     │   Q₀ → Q₁ → Q₂ → ... → Qₙ → A    │
│         ↑    ↑    ↑         ↑           │         ↑                         │
│         └────┴────┴─────────┘           │    (each Qᵢ is self-contained)   │
│     (must track ALL prior history)      │    (memoryless — discard history)│
└─────────────────────────────────────────────────────────────────────────────┘

THE TWO-PHASE CYCLE: Decomposition → Contraction (repeat until atomic)

    ┌──────────────────────────────────────────────────────────────────┐
    │  PHASE 1: DECOMPOSITION                                          │
    │                                                                   │
    │  Given question Qᵢ, build a DAG of subquestions:                │
    │                                                                   │
    │       Q₀: "What is total revenue considering sales & services?" │
    │                              │                                    │
    │              ┌───────────────┼───────────────┐                   │
    │              ▼               ▼               ▼                   │
    │           ┌─────┐        ┌─────┐        ┌─────┐                  │
    │           │ N₁  │        │ N₂  │        │ N₃  │                  │
    │           │     │        │     │        │     │                  │
    │           │Sales│        │Svc  │        │Total│◄── dependent    │
    │           │rev? │        │rev? │        │     │    on N₁, N₂    │
    │           └──┬──┘        └──┬──┘        └──▲──┘                  │
    │              │              │              │                      │
    │              └──────────────┴──────────────┘                      │
    │                        (edges = dependencies)                     │
    └──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │  PHASE 2: CONTRACTION                                            │
    │                                                                   │
    │  1. Solve INDEPENDENT nodes (no incoming edges): N₁, N₂         │
    │  2. "Bake in" their answers to simplify the problem              │
    │  3. Discard solved nodes, reformulate into Qᵢ₊₁                  │
    │                                                                   │
    │  Before:  "What is total revenue from sales and services?"       │
    │                                                                   │
    │  After:   "Given sales=$1M and services=$500K, what is total?"  │
    │            ↑                                                      │
    │            └── Contracted question Qᵢ₊₁ (simpler, answer-equiv) │
    └──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         Repeat until ATOMIC
                    (no further decomposition possible)

WHAT MAKES A QUESTION "ATOMIC"?
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Indivisible — further decomposition loses semantic coherence            │
│  • Self-contained — requires no external history                           │
│  • Low complexity — answerable directly with high stability                │
│  • Emergent property — discovered during reasoning, not imposed a priori   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Chain of Verification (CoVe) — From the Paper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CHAIN OF VERIFICATION (CoVe)                            │
│                   arxiv.org/abs/2309.11495 (Meta AI, 2023)                  │
└─────────────────────────────────────────────────────────────────────────────┘

CORE INSIGHT: LLMs answer SIMPLE verification questions more accurately than
complex original queries. Use this to self-correct.

THE FOUR STEPS:

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: GENERATE BASELINE RESPONSE                                          │
│                                                                              │
│   User: "Name some politicians born in NYC"                                 │
│                                                                              │
│   LLM:  "Hillary Clinton, Donald Trump, Michael Bloomberg..."              │
│          ↑                                                                   │
│          └── May contain hallucinations (plausible but wrong)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PLAN VERIFICATION QUESTIONS                                          │
│                                                                              │
│   For each claim, generate a targeted question:                             │
│                                                                              │
│   • "Where was Hillary Clinton born?"                                       │
│   • "Where was Donald Trump born?"                                          │
│   • "Where was Michael Bloomberg born?"                                     │
│                                                                              │
│   NOT template-based — LLM generates questions that would reveal errors     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: EXECUTE VERIFICATION  ← ← ← THIS IS THE KEY INNOVATION             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  FACTORED EXECUTION: Answer each question INDEPENDENTLY             │  │
│   │                                                                      │  │
│   │  ✗ WRONG: "Let me confirm that Hillary was born in NYC..."         │  │
│   │           (biased — already primed to confirm)                      │  │
│   │                                                                      │  │
│   │  ✓ RIGHT: "Where was Hillary Clinton born?"                         │  │
│   │           → "Hillary Clinton was born in Chicago, Illinois"         │  │
│   │           (fresh answer — no access to original claim)              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Why factored? Models that see their own wrong answers tend to REPEAT     │
│   them. Isolation prevents bias reinforcement.                              │
│                                                                              │
│   Verification answers:                                                     │
│   • Hillary Clinton → Chicago, IL (INCONSISTENT with "NYC")                │
│   • Donald Trump → Queens, NYC (VERIFIED)                                   │
│   • Michael Bloomberg → Boston, MA (INCONSISTENT with "NYC")               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: GENERATE FINAL VERIFIED RESPONSE                                     │
│                                                                              │
│   Cross-check verification answers against original claims                  │
│   Generate corrected response removing/fixing inconsistencies               │
│                                                                              │
│   Final: "Donald Trump was born in NYC. Note: Hillary Clinton              │
│           (Chicago) and Michael Bloomberg (Boston) were not."              │
└─────────────────────────────────────────────────────────────────────────────┘

EXECUTION VARIANTS (from the paper):
┌──────────────────┬───────────────────────────────────────────────────────────┐
│ Joint            │ Plan + execute in one prompt (prone to repeating errors) │
│ 2-Step           │ Separate prompts for planning vs answering               │
│ Factored         │ Each verification question answered in ISOLATION         │
│ Factor+Revise    │ Factored + explicit cross-check step for inconsistencies │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

---

## How UltraThink Combines AoT + CoVe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ULTRATHINK COMBINED PIPELINE                           │
│                                                                              │
│   AoT provides STRUCTURE (what to verify)                                   │
│   CoVe provides ACCURACY (how to verify)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │   User Query    │
                        │                 │
                        │ "Is this auth   │
                        │  approach       │
                        │  secure?"       │
                        └────────┬────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: DECOMPOSITION (AoT Agent)                                         │
│                                                                             │
│  Decompose into DAG with dependency levels:                                │
│                                                                             │
│  Level 0 (independent):                                                    │
│    [A1] What auth standard fits stateless API? (needs_cov: true)          │
│    [A2] Where should token validation occur? (needs_cov: false)           │
│                                                                             │
│  Level 1 (depends on L0):                                                  │
│    [A3] How should tokens be stored client-side? (deps: [A1])             │
│                                                                             │
│  Level 2 (synthesis):                                                      │
│    [FINAL] Complete auth recommendation (deps: [A2, A3])                  │
│                                                                             │
│  Writes to: .questionably-ultrathink/{session}/atoms/*.md                  │
│  Writes: metadata.md with verification_order by level                     │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: VERIFICATION (CoVe Agent) — PARALLEL BY LEVEL                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ WAVE 1: Verify Level 0 atoms (A1, A2) — IN PARALLEL                 │  │
│  │                                                                      │  │
│  │   [A1] Read atoms/A1.md                                             │  │
│  │        Extract claims: "JWT is stateless, self-contained"           │  │
│  │        Verification Q: "Is JWT truly stateless?"                    │  │
│  │        Independent answer: (factored — no access to A1)             │  │
│  │        Compare → ✓ VERIFIED or ⚠️ INCONSISTENT                      │  │
│  │                                                                      │  │
│  │   If error found → Write corrections/A1.md                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ CORRECTION CHECK: Any corrections/A*.md files?                       │  │
│  │                                                                      │  │
│  │   YES → Invoke aot-recompute agent                                  │  │
│  │         Recompute dependent atoms (A3, FINAL) with corrected A1     │  │
│  │         Add recomputed atoms to verification queue                  │  │
│  │                                                                      │  │
│  │   NO → Proceed to next level                                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ WAVE 2: Verify Level 1 atoms (A3) — uses corrected context          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  (repeat correction check, recompute if needed, continue to next level)   │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: SYNTHESIS                                                         │
│                                                                             │
│  Combine all verified/corrected atoms into final response                  │
│                                                                             │
│  [A1] JWT (verified) + [A2] middleware (verified) +                       │
│  [A3] httpOnly cookies (verified) → [FINAL] Complete recommendation       │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FINAL VERIFICATION (CoVe on synthesis)                           │
│                                                                             │
│  Apply CoVe to the synthesized response itself                             │
│  Catch any errors introduced during synthesis                              │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: ITERATION (if rigor = thorough or high-stakes)                   │
│                                                                             │
│  Check confidence vs threshold:                                            │
│    Standard:    1 iteration, no threshold                                  │
│    Thorough:    up to 2 iterations, ≥70% confidence                       │
│    High-Stakes: up to 3 iterations, ≥85% confidence                       │
│                                                                             │
│  If below threshold → re-analyze problematic atoms → repeat verification  │
└────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ FINAL RESPONSE  │
                        │                 │
                        │ [VERIFIED]      │
                        │ Confidence: 87% │
                        └─────────────────┘


FILE-BASED INTER-AGENT COMMUNICATION:
┌─────────────────────────────────────────────────────────────────────────────┐
│  .questionably-ultrathink/{session-id}/                                     │
│  ├── metadata.md          # DAG structure, rigor, verification_order       │
│  ├── atoms/                                                                 │
│  │   ├── A1.md            # Reasoning chain, sources, confidence           │
│  │   ├── A2.md                                                              │
│  │   ├── A3.md                                                              │
│  │   └── FINAL.md                                                           │
│  └── corrections/         # Written by CoVe when errors found              │
│      └── A1.md            # Original claim, verification, corrected answer │
│                                                                              │
│  WHY FILES? Subagents don't share context. Files enable communication      │
│  without bloating context windows.                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Innovations in the Combination

| From AoT | From CoVe | Combined Benefit |
|----------|-----------|------------------|
| DAG decomposition | — | Know WHAT to verify (structure) |
| Dependency levels | — | Verify in correct order |
| Markov property (discard irrelevant context) | Factored execution (isolate verification) | Both prevent context contamination |
| — | Verification questions | Know HOW to verify (accuracy) |
| — | Independent answering | Avoid bias reinforcement |
| Atoms have `needs_cov` flag | — | Don't waste verification on trivial atoms |
| Contraction (carry forward only needed info) | — | Efficient recomputation after corrections |

The key insight: **AoT gives you a structured graph of reasoning units, and CoVe gives you a way to verify each unit independently. Together, they catch both decomposition errors AND factual errors, with efficient recomputation when corrections propagate through dependencies.**
