import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { PDFParse } from "pdf-parse";
import { PrismaClient } from "@prisma/client";
import { extractWithAi, extractionWarning } from "../src/lib/resume";

function loadLocalEnv() {
  const filename = resolve(".env");
  if (!existsSync(filename)) return;
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function main() {
  loadLocalEnv();
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required for this real extraction regression check.");
  const filename = "C:\\Users\\Rehman\\Downloads\\Muhammad_Rahman_CV.pdf";
  const parser = new PDFParse({ data: readFileSync(filename) });
  const result = await parser.getText(); await parser.destroy();
  const text = result.text.trim();
  const data = await extractWithAi(text);
  const counts = { skills: data.skills.length, education: data.education.length, experience: data.experience.length, projects: data.projects.length, learningInterests: data.learningInterests.length };
  if (counts.skills < 8 || counts.education < 2 || counts.experience < 2 || counts.projects < 3) throw new Error(`Extraction coverage is incomplete: ${JSON.stringify(counts)}`);
  if (extractionWarning(text, data)) throw new Error("Extraction completeness warning was raised.");

  const prisma = new PrismaClient(); const suffix = randomUUID(); let candidateId: string | undefined;
  try {
    const candidate = await prisma.user.create({ data: { name: "Regression Candidate", email: `resume-regression-${suffix}@local.test`, passwordHash: "not-used", role: "CANDIDATE" } }); candidateId = candidate.id;
    const saved = await prisma.resume.create({ data: { candidateId: candidate.id, originalName: "regression.pdf", mimeType: "application/pdf", storagePath: "regression.pdf", text, extractedData: JSON.stringify(data) } });
    const reloaded = await prisma.resume.findUniqueOrThrow({ where: { id: saved.id } });
    const persisted = JSON.parse(reloaded.extractedData) as typeof data;
    if (persisted.projects.length !== counts.projects || persisted.experience.length !== counts.experience || !persisted.projects.every((item) => Boolean(item.evidence))) throw new Error("Resume extraction did not persist supported entries and evidence.");
    console.log(`PASS resume regression: text=${text.length}; skills=${counts.skills}; education=${counts.education}; experience=${counts.experience}; projects=${counts.projects}; persisted=true.`);
  } finally { if (candidateId) await prisma.user.delete({ where: { id: candidateId } }); await prisma.$disconnect(); }
}

main().catch((error: unknown) => { console.error("FAIL resume regression:", error instanceof Error ? error.message : error); process.exitCode = 1; });
