# RFC: Should BeaverLink's First Release Store Text Embeddings for Matching?

| Field | Value |
| --- | --- |
| Author | Tyler Quach |
| Date | 2026-11-22 |
| Status | Proposed |
| Decision Date | [fill when decided] |
| Deciders | BeaverLink team |
| Superseded By | n/a |

*This RFC is sanitized: the university, the project partner, and the partner's alumni-platform vendor are referred to by role. Other RFCs this term cover the account and authentication platform and the profile data source. This RFC assumes a PostgreSQL database with the pgvector extension is available and does not decide those questions.*

## Problem and Context

BeaverLink is a web application, built by a four-person capstone team for a university alumni association, that recommends which students and alumni should meet at a networking event. It works before an event and while the event is running. Its inputs are survey answers, profile fields, and free-text career goals. The part of the project this decision touches is the matching engine, a Python service (FastAPI) that ranks attendees for each other.

The team's technology stack document proposes scikit-learn for structured scoring and marks Sentence Transformers embeddings and pgvector search "optional." Its pending-decisions list includes "whether embeddings and vector search are necessary for the initial release." Its implementation strategy builds the structured baseline first and defers semantic matching to step 6, "evaluate semantic matching and other AI enhancements."

**Decision needed.** Whether the first release stores text embeddings of users' free-text answers and, if so, on what terms: which model, where the model runs, and how the vectors are stored.

**Why this can be hard to reverse, and when it is not.** Amazon calls a decision that is costly or impossible to undo a "Type 1" decision and an easily undone one "Type 2" ([Bezos, 2015 shareholder letter](https://www.aboutamazon.com/news/company-news/2015-letter-to-shareholders) [confirm URL and wording]). A matching feature is normally Type 2, because ranking code can be swapped. Three choices inside it become Type 1 if made carelessly:

1. **Schema.** A pgvector column declares a fixed dimension, such as `vector(384)`, and the standard `vector` type can be indexed up to 2,000 dimensions ([pgvector README](https://github.com/pgvector/pgvector)). Changing the model usually changes the dimension, so every stored vector must be regenerated and the column and index rebuilt.
2. **Data flow.** Sending users' free-text career goals to a hosted embedding API is a data-use commitment that cannot be undone for text already sent. The partner has not given us data-use terms.
3. **Coupling.** If match explanations, ranking, and the profile table all depend on embedding scores, removing or replacing them later means redesigning the product, not swapping a library.

The decision becomes reversible if embeddings live in a separate, regenerable table that nothing else depends on, computed locally. This RFC recommends that design on purpose.

**Why now.** Step 1 of the implementation strategy lays down the database foundation, and the first schema migration is the cheapest moment to decide whether a `vector` column exists and where. The team also has no real event data yet, so any claim that embeddings improve matching is currently untested.

**If we do nothing.** Embeddings arrive by drift: a teammate or coding agent adds a `vector` column to the profile table, calls a hosted API for convenience, and the first release depends on it. The choice is then made by whoever writes the first migration, without review.

## Options

### Option A: Structured scoring only; no embeddings in v1

Weighted scoring over survey and profile fields with scikit-learn, and a revisit after the first real event.

*Costs.* Free-text answers go unused, and related goals phrased differently ("break into data science" and "ML career") look unrelated. The stack document names keyword-only matching as the risk of missing semantic relationships. If embeddings are wanted later, no table, flag, or evaluation harness exists yet.

*Right choice when* the survey is mostly structured, free text is optional or short, or the capstone timeline cannot absorb an evaluation.

### Option B: Hosted embedding API from day one, vector column on the profile table

Send free-text answers to a hosted service and store the returned vector beside each profile row.

*Costs.* Free text leaves our infrastructure under terms we have not reviewed. Per-call cost and vendor model deprecation can force re-embedding. The dimension is locked into the main schema, and matching depends on an external service being up.

*Right choice when* the partner approves third-party processing in writing and a measured quality gap on our own data justifies it.

### Option C: Do nothing

Make no decision and let the first migration settle it. The cost is the drift scenario above, and it arrives at the first schema migration, which is soon. Staying put would be right only if the stack document's sequencing were enforced, so that embeddings could not appear before step 6. Nothing in the repository enforces that.

### Option D: Local open model, regenerable table, gated feature (recommended)

Run a small open Sentence Transformers model inside the FastAPI service. Store vectors in a separate `profile_embeddings` table keyed by user and `(model_id, dimension)`, never on the profile table. Embedding similarity is one weighted feature in the hybrid score, behind a feature flag that stays off until offline evaluation shows it helps.

*Costs.* The model must be downloaded and held in backend memory. Long answers are truncated (see Analysis). The team needs extra tests, an evaluation harness, and slightly more schema.

*Right choice when* free text matters, data must stay on our infrastructure, and we want the option to remove embeddings cheaply. That describes our situation.

### Considered and rejected: embeddings only

Replacing structured scoring with embedding similarity. The stack document notes that embedding-only matching "may overlook complementary networking goals" (a student seeking a mentor and an alumnus offering one are not "similar"), and weighted scoring is what lets the team explain why two people matched. It would be right only if the survey had no structured fields at all.

## Analysis

**Why a small local model is plausible.** A widely used small Sentence Transformers model, `all-MiniLM-L6-v2`, produces 384-dimensional vectors and by default cuts input off after 256 word pieces, according to a model-card mirror ([mirror](https://huggingface.co/mmine/all-MiniLM-L6-v2)); the official model page lists its license as Apache 2.0 ([official page](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)). Supabase's pgvector guide uses a `vector(384)` column in its example ([Supabase](https://supabase.com/docs/guides/database/extensions/pgvector)), so this dimension is well supported. That guide says nothing about switching models, which is why Option D records `model_id` and `dimension` per row and carries that risk ourselves. pgvector also offers `halfvec`, indexable up to 4,000 dimensions, so a larger model later would not necessarily force a different index type ([pgvector README](https://github.com/pgvector/pgvector)).

**Truncation is a real quality risk.** The 256-word-piece default means a long career-goals answer is silently cut. Option D therefore includes a length test and a survey length limit. We have no real answers yet, so how often this happens is unmeasured.

**Privacy and retention.** Free-text career goals are personal data about students and alumni, and the stack document lists "data privacy, consent, and retention requirements" as pending. Vectors are derived from that text and should be treated as equally sensitive. Under Option D they sit in our own database under the same access rules as the source text, and deleting a user is a cascading delete on one table keyed by user ID. Under Option B the provider also holds the text, and deletion depends on a retention policy we cannot verify. This is the strongest single argument for D over B, and it does not depend on any quality claim.

**Complexity and cost.** D adds a model dependency, one table, one flag, and one evaluation script, which is justified only if evaluation shows a gain; that is why the flag defaults to off. B adds a recurring bill that scales with profile edits [confirm whether the team has any budget for one].

**Project evidence.** The stack document marks embeddings and vector search optional and sequences them after the structured baseline (Implementation Strategy, steps 3 to 6). The team repository enforces pull requests and runs CI on every PR to `dev` and `main` (commit 4d3a842), so the checks below can become required status checks. [Confirm whether the CI database service includes pgvector; if not, adding it is the first verification task.]

**Uncertainty.** We have no real survey responses, no labeled examples of good matches, and no event-size data. Whether embeddings beat structured scoring here is unknown, which is exactly why Option D ships them off by default. The design turns what could be a quality bet into a measured, removable experiment.

## Recommendation and Verification Plan

**Recommend Option D**, with the rule that embeddings are computed only inside the `matching/embeddings/` module, stored only in `profile_embeddings`, and enabled only after check 2 passes. If the team chose another option, checks 1, 3, and 7 still apply to it, and Option B would additionally require the partner's written approval first.

Checks are pass/fail and run in the existing PR CI once the backend exists.

1. **Removability test.** Run the full backend test suite with the `profile_embeddings` table dropped and the flag off. *Pass:* all tests green and recommendations still return. *Detects:* hidden dependence on embeddings.
2. **Offline quality evaluation.** Build a labeled set of synthetic profile pairs, with good-match judgments from at least two teammates, and compare structured-only against hybrid on NDCG@5. *Pass:* the flag is switched on only if hybrid beats the baseline by a margin the team fixes before running the experiment. *Detects:* adopting embeddings that do not help.
3. **No-egress test.** In CI, run the embedding module with outbound network access blocked. *Pass:* embeddings still compute. *Detects:* any accidental call to a hosted API.
4. **Model-swap test.** Regenerate all vectors under a second model with a different dimension into new rows and run matching. *Pass:* works with no change outside `matching/embeddings/` and one migration, and finishes within one working session on the synthetic dataset. *Detects:* schema lock-in.
5. **Explainability test.** Every recommendation returns per-feature scores that sum to its total. *Pass:* embedding similarity appears as its own labeled feature. *Detects:* opaque scoring.
6. **Truncation and timing test.** An answer longer than the model's input limit is flagged or chunked, never silently cut, and embedding time per profile edit is measured and recorded. *Detects:* the quality risk above and latency.
7. **Revisit trigger.** If check 2 fails, leave the flag off and delete the table. If the partner later approves a hosted service and measurements justify it, write a follow-up decision record.

## Constraints

- **Licensing.** The model and the Sentence Transformers library are both Apache 2.0 ([model page](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [library repository](https://github.com/UKPLab/sentence-transformers)). That permits our use and requires keeping the license text and notices if we ship the model files in a container image, so the build includes them. [Confirm pgvector's license, which I understand to be the PostgreSQL License, on its repository.] None of these licenses rules out an option.
- **Data use.** Free-text career goals about students and alumni are personal data. The partner's data-use terms and the university's privacy requirements, including whether FERPA applies, are pending (stack document, Pending Decisions). This rules out Option B until the partner approves in writing and adds check 3. Derived vectors are personal data too, so they fall under the same consent and retention rules and must be deletable per user.
- **IP.** [State what the course and partner agreement says about who owns the code and data, or say you have not confirmed it.] Option D relies only on openly licensed components, so it adds no third-party IP obligations.
- **Partner confidentiality.** No partner, vendor, or contact is named, and tests use synthetic profiles only.

## Delegation and Validation

[Edit this section so it describes only what you actually did. The text below is a starting point from the record; delete or change anything untrue.]

- **What I handed to AI tools.** I used Claude to draft the October version of this RFC from the team's stack document, to look up the pgvector, Supabase, and model-card facts, and to propose the structure of the verification checks. For this final draft I used Claude to restructure it into the course template, expand the analysis, and re-check the license and dimension-limit citations. No code on this decision was generated.
- **Checks that made that reasonable.** Pull requests are required and CI runs on every PR to `dev` and `main` (commit 4d3a842). Embeddings stay behind a flag that is off by default, and vectors live in a separate table, so rollback is dropping it. [The verification checks above are planned, not yet running; say which now exist.]
- **Where I stopped and validated myself.** [Replace with what you really did. Candidates, if true: opened the pgvector README and confirmed the 2,000-dimension index limit; confirmed the model's license on the official page; confirmed the 384-dimension and 256-word-piece figures on the official model card, not only the mirror; read the Supabase guide; confirmed the 2015 letter wording; reviewed the table design and dimension handling by hand; will write the labeled pairs and success margin myself before running any evaluation.] I can defend the choice among options without the tool.

## Decision

**Proposed** as of 2026-11-22, awaiting team discussion and the partner's answers on data-use terms. [Update to Accepted, Rejected, or Superseded with the date and who chaired the decision.] If the partner approves third-party processing, or check 2 fails, this RFC is revisited.

## References

- pgvector README: https://github.com/pgvector/pgvector
- Supabase, "pgvector: Embeddings and vector similarity": https://supabase.com/docs/guides/database/extensions/pgvector
- Sentence Transformers `all-MiniLM-L6-v2`, official model page: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- Model-card mirror used for the 384-dimension and 256-word-piece figures: https://huggingface.co/mmine/all-MiniLM-L6-v2
- Sentence Transformers library repository: https://github.com/UKPLab/sentence-transformers

## Revision Log

| Source | Comment | Response | Change made |
| --- | --- | --- | --- |
| [Instructor / peer review / partner] | [Paste comment] | [Your response] | [What changed] |
