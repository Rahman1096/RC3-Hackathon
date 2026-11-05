# Progress

## Completed

- Modules 0–3: Next.js/SQLite foundation, Auth.js roles, job management, private PDF parsing/review, applications, Gemini extraction/embeddings, evidence matching, weighted scoring, and recruiter review.
- Module 3 migration applied. Candidate status changes remain manual and are audited; recruiter notes are private.
- TypeScript and ESLint pass. Real Gemini generation/embedding, paraphrase similarity, score arithmetic, exact evidence checks, SQLite read/write, and real-PDF extraction pass.
- Production build compiled successfully; local Next emits a warning about its Windows native SWC binary and uses WASM.

## Blockers

- None for Modules 0–3. Gemini calls require `GEMINI_API_KEY` in local `.env`.

## Next

- Module 4: interview questions, scheduling, feedback, and analytics.
