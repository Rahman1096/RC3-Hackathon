import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { embedText, generateStructured } from "../src/lib/gemini";
import { z } from "zod";

function loadLocalEnv() {
  const filename = resolve(".env");
  if (!existsSync(filename)) return;
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function verifyDatabase() {
  process.env.DATABASE_URL ??= "file:./dev.db";
  const prisma = new PrismaClient();
  try {
    const created = await prisma.systemCheck.create({ data: { label: "module-0" } });
    const found = await prisma.systemCheck.findUnique({ where: { id: created.id } });
    if (!found) throw new Error("SQLite read after write did not return the check record.");
    await prisma.systemCheck.delete({ where: { id: created.id } });
    console.log("PASS database: SQLite Prisma write/read/delete completed.");
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyPdf() {
  const supplied = process.argv[2];
  const demoPdf = "C:\\Users\\Rehman\\Downloads\\RC3 - Web_Tasks.pdf";
  const filename = supplied ?? (existsSync(demoPdf) ? demoPdf : undefined);
  if (!filename) {
    console.log("BLOCKED pdf: supply a real PDF path to run text extraction.");
    return;
  }
  const parser = new PDFParse({ data: readFileSync(filename) });
  try {
    const result = await parser.getText();
    if (!result.text.trim()) throw new Error("PDF extraction returned empty text.");
    console.log(`PASS pdf: extracted ${result.text.trim().length} characters from ${filename}.`);
  } finally {
    await parser.destroy();
  }
}

async function verifyAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("BLOCKED ai: GEMINI_API_KEY is not configured; generation and embedding calls were not attempted.");
    return;
  }
  const [generated, embedding] = await Promise.all([
    generateStructured("Return a JSON object confirming this Gemini verification.", { type: "object", properties: { result: { type: "string" } }, required: ["result"], additionalProperties: false }, z.object({ result: z.string() })),
    embedText("Python Django PostgreSQL Docker"),
  ]);
  console.log(`PASS ai: Gemini generation (${generated.result}) and ${embedding.length}-dimension embedding completed.`);
}

async function main() {
  loadLocalEnv();
  await verifyDatabase();
  await verifyPdf();
  await verifyAi();
}

main().catch((error: unknown) => {
  console.error("FAIL module-0:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
