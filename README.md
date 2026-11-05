# Talent Intelligence Platform

Local-first, evidence-based recruitment platform for managing jobs, resumes,
applications, matching, interviews, and recruiting analytics. The application
supports separate recruiter and candidate workflows and keeps recruiters in
control of final decisions.

## Features

- Role-based authentication for recruiters and candidates
- Recruiter job creation, editing, publishing, and closing
- Candidate PDF resume upload, text extraction, AI-assisted profile extraction,
  review, and correction
- Job applications with status history and recruiter notes
- Gemini-powered requirement extraction, resume evidence assessment, and
  interview question generation
- Embedding-based semantic matching with cosine similarity
- Weighted matching scores for skills, experience, projects, and qualifications
- Verbatim evidence excerpts and explicit missing-evidence explanations
- Interview scheduling, feedback, decisions, and dashboard metrics
- Privacy-aware matching that excludes names, contact details, and protected
  attributes from AI assessment and scoring

## Tech stack

Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, SQLite,
NextAuth, Zod, and the Google Gemini API.

## Requirements

- Node.js 20.9 or later
- npm
- A Gemini API key for live AI extraction, embeddings, matching, and interview
  question generation. The rest of the application can run locally without it.

## Local setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Environment variables

Configure `.env` locally and never commit secrets:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.5-flash-lite"
GEMINI_EMBEDDING_MODEL="gemini-embedding-001"
```

`GEMINI_API_KEY` enables real Gemini generation and embeddings. When it is not
configured, AI-dependent actions report a visible blocked/error state rather
than returning fake successful results.

## Demo flow

1. Register a recruiter and create an open job.
2. Register a candidate, upload a PDF resume, review the extracted profile, and
   save corrections.
3. Apply to the job from the candidate dashboard.
4. Open the application from the recruiter dashboard to review evidence,
   matching scores, missing evidence, and the audit history.
5. Shortlist the candidate, generate or edit interview questions, schedule an
   interview, and record feedback or a decision.
6. Review pipeline counts, shortlist rate, processing time, and common
   evidence gaps on the recruiter dashboard.

## Matching model

The displayed score is calculated as:

`skills × 0.50 + experience × 0.25 + projects × 0.15 + qualifications × 0.10`

Required skill importance can change the skill component. Gemini embeddings
retrieve relevant resume excerpts, and cosine similarity contributes to project
relevance. Evidence is only accepted when the excerpt exists in the stored
resume text. Missing evidence is not treated as proof that a candidate lacks a
skill, and recruiters make the final application decisions.

## Useful commands

```bash
npm run dev
npm run lint
npm run build
npm run db:verify
npm run match:verify
npm run interview:verify
npm run resume:verify
```

The verification scripts exercise SQLite/Prisma, PDF extraction, matching and
score arithmetic, interview rules, and resume persistence. The resume verifier
also accepts an optional absolute PDF path:

```bash
npm run resume:verify -- "/absolute/path/to/resume.pdf"
```

## Project structure

```text
src/app/        Next.js pages, role dashboards, forms, and server actions
src/lib/        Authentication, Prisma, resume, Gemini, and matching logic
prisma/         SQLite schema and migrations
scripts/        Local verification and regression checks
docs/           Architecture, matching, plan, and progress notes
```

## Data and privacy

The default database is a local SQLite file. Resume files are stored locally
for development, and `.env` plus generated database files should remain
untracked. Matching deliberately filters personal contact information and
protected attributes from assessment inputs.
