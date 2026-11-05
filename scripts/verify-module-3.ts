import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cosineSimilarity, embedTexts } from "../src/lib/gemini";
import { verifiedEvidence, weightedTotal } from "../src/lib/matching";

function loadLocalEnv() { const file = resolve(".env"); if (!existsSync(file)) return; for (const line of readFileSync(file, "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2]; } }

async function main() {
  const weighted = weightedTotal({ skills: 80, experience: 60, projects: 40, qualifications: 20 });
  assert.equal(weighted, 63, "weighted score formula");
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0, "orthogonal vectors");
  assert.deepEqual(verifiedEvidence("Built scalable HTTP services with Django", ["Built scalable HTTP services", "not in source"]), ["Built scalable HTTP services"]);
  console.log("PASS scoring arithmetic, cosine similarity, and exact evidence validation.");
  loadLocalEnv();
  if (!process.env.GEMINI_API_KEY) { console.log("BLOCKED semantic retrieval: GEMINI_API_KEY is not configured."); return; }
  const [job, paraphrase] = await embedTexts(["REST API development", "Designed and maintained HTTP endpoints for service integration"]);
  const similarity = cosineSimilarity(job, paraphrase);
  assert.ok(similarity > 0.2, `expected positive semantic similarity, received ${similarity}`);
  console.log(`PASS Gemini paraphrase embedding similarity: ${similarity.toFixed(3)}.`);
}

main().catch((error: unknown) => { console.error("FAIL module-3:", error instanceof Error ? error.message : error); process.exitCode = 1; });
