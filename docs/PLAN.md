# Plan

## Requirement checklist mapped to rubric

| Rubric | Requirements | Acceptance check |
| --- | --- | --- |
| Architecture & functional completeness (30) | Role-based auth, job lifecycle, applications, status audit, interviews, dashboard | Recruiter and candidate flows work end to end locally. |
| AI implementation & matching (25) | Requirement extraction, embeddings, cosine similarity, evidence, gaps, interview questions, semantic search | Live provider calls produce traceable evidence; unavailable credentials are visibly blocked. |
| Resume parsing & extraction (15) | PDF upload, extract contact/skills/education/experience/projects, normalization, corrections, failures | Real PDF text is extracted and its parsed profile can be edited. |
| UI & experience (15) | Role dashboards, responsive recruiter review, candidate status | Demo scenario is easy to run and review. |
| Innovation, testing, security & deployment (15) | Human override, fairness guardrail, duplicate review, validation, secure sessions, local setup | Critical flow verified; no protected attributes are scored. |

## Module order

0. Foundation verification: startup, SQLite Prisma read/write, real-PDF text extraction, live AI checks when credentials exist.
1. Authentication and job management.
2. Resume parsing, editable profiles and applications.
3. Semantic matching, explanations and recruiter review.
4. Interview questions, scheduling and analytics.
5. UI polish and critical verification.
6. Submission and rehearsal.

## Demo acceptance

- Recruiter creates a Backend Developer job requiring Python, Django, PostgreSQL and Docker.
- Three candidates submit PDF resumes.
- Evidence, relevance scores, missing evidence, and explanations are visible.
- Recruiter manually shortlists one candidate, generates/edit questions, schedules an interview, and dashboard metrics update.
