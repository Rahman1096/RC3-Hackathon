import Link from "next/link";
import { cosineSimilarity, embedTexts } from "@/lib/gemini";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resumeDataSchema } from "@/lib/resume";

type SearchParams = { q?: string };

function profileText(extractedData: string, resumeText: string) {
  const data = resumeDataSchema.parse(JSON.parse(extractedData));
  const entries = [...data.skills, ...data.experience, ...data.projects, ...data.education];
  const verified = entries.filter((entry) => entry.evidence && resumeText.includes(entry.evidence));
  return {
    text: verified.map((entry) => `${entry.value}\nEvidence: ${entry.evidence}`).join("\n"),
    evidence: verified.map((entry) => entry.evidence).filter((value): value is string => Boolean(value)),
  };
}

export default async function RecruiterSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const recruiter = await requireRole("RECRUITER");
  const query = ((await searchParams).q || "").trim();
  const applications = query ? await prisma.application.findMany({
    where: { job: { recruiterId: recruiter.id } },
    include: { candidate: { select: { name: true } }, job: { select: { id: true, title: true } }, resume: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  }) : [];

  let blocked: string | null = null;
  let results: Array<{ id: string; name: string; jobTitle: string; jobId: string; score: number; evidence: string[] }> = [];
  if (query && applications.length) {
    try {
      const profiles = applications.map((application) => profileText(application.resume.extractedData, application.resume.text));
      const vectors = await embedTexts([query, ...profiles.map((profile) => profile.text)]);
      results = applications.map((application, index) => ({
        id: application.id,
        name: application.candidate.name,
        jobTitle: application.job.title,
        jobId: application.job.id,
        score: cosineSimilarity(vectors[0], vectors[index + 1]),
        evidence: profiles[index].evidence,
      })).sort((left, right) => right.score - left.score).slice(0, 20);
    } catch (error) {
      blocked = error instanceof Error ? error.message : "Semantic search is unavailable. Please retry.";
    }
  }

  return <main className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-cyan-300">TALENT INTELLIGENCE</p><h1 className="mt-1 text-3xl font-bold">Find talent by evidence</h1><p className="mt-2 text-sm text-slate-400">Search reviewed applicant evidence semantically, even when resumes use different wording.</p></div>
      <Link href="/recruiter" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to dashboard</Link>
    </div>
    <form method="get" className="mt-7 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:flex-row">
      <label className="flex-1"><span className="text-sm text-slate-300">Natural-language search</span><input name="q" defaultValue={query} placeholder="Python developers with REST API experience" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-3" /></label>
      <button className="self-end rounded bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 active:scale-[.98]">Search talent</button>
    </form>
    {!query && <p className="mt-6 rounded border border-slate-800 p-5 text-sm text-slate-400">Try a query such as <span className="text-cyan-200">“Python developers with REST API experience”</span>.</p>}
    {query && blocked && <p role="alert" className="mt-6 rounded border border-amber-800 bg-amber-950 p-4 text-sm text-amber-100">Semantic search is blocked: {blocked}</p>}
    {query && !blocked && !applications.length && <p className="mt-6 text-slate-400">No reviewed applicants are available for semantic search yet.</p>}
    {query && !blocked && results.length > 0 && <section className="mt-7 grid gap-4">{results.map((result) => <article key={result.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{result.name}</h2><p className="text-sm text-slate-400">Applied to {result.jobTitle}</p></div><span className="rounded bg-cyan-950 px-3 py-1 text-sm font-semibold text-cyan-200">{Math.round(result.score * 100)}% semantic match</span></div><h3 className="mt-4 text-sm font-semibold">Supporting resume evidence</h3>{result.evidence.slice(0, 3).map((evidence) => <blockquote key={evidence} className="mt-2 border-l-2 border-cyan-500 pl-3 text-xs text-slate-300">{evidence}</blockquote>)}<Link href={`/recruiter/jobs/${result.jobId}/applicants`} className="mt-4 inline-block text-sm text-cyan-300 hover:text-cyan-200">Review application →</Link></article>)}</section>}
  </main>;
}
