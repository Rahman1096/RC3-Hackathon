# Talent Intelligence Platform

## Local setup

Requires Node.js 20.9+ and npm.

```powershell
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

Open `http://localhost:3000`.

## Vercel + Neon deployment

Create a free Neon PostgreSQL database and set its pooled connection string as `DATABASE_URL` in Vercel. Also set `AUTH_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_EMBEDDING_MODEL`. The Vercel build pushes the Prisma schema to the empty Neon database before building the app. Uploaded PDF bytes are stored in PostgreSQL so they do not depend on Vercel's temporary filesystem.

## Optional live AI configuration

Set these in `.env` without sharing secrets in chat:

```dotenv
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
GEMINI_EMBEDDING_MODEL="gemini-embedding-001"
```

`GEMINI_API_KEY` enables real Gemini generation and embeddings. Module 0 reports those checks as blocked when it is absent.

## Verification

```powershell
npm run db:verify
npm run lint
npm run build
```

The Module 0 verifier creates and removes only its own SQLite verification record. It also accepts an optional absolute PDF path:

```powershell
npm run db:verify -- "C:\path\to\resume.pdf"
```
