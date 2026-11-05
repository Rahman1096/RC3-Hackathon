import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const jobs = [
  ["Demo · Backend Developer", "Engineering", "Remote", ["Python", "Django", "PostgreSQL", "Docker"]],
  ["Demo · Frontend Engineer", "Product", "Lahore", ["React", "TypeScript", "CSS"]],
  ["Demo · Data Analyst", "Analytics", "Karachi", ["Python", "SQL", "Pandas"]],
  ["Demo · DevOps Engineer", "Infrastructure", "Remote", ["Docker", "AWS", "Kubernetes"]],
  ["Demo · Product Designer", "Design", "Islamabad", ["Figma", "UX Research", "Prototyping"]],
] as const;

const candidates = [
  ["Demo Candidate 1", "demo.candidate1@example.com", ["Python", "Django", "PostgreSQL"], "Built REST APIs with Django and PostgreSQL for a logistics platform."],
  ["Demo Candidate 2", "demo.candidate2@example.com", ["React", "TypeScript", "CSS"], "Developed responsive React dashboards with TypeScript and accessible CSS."],
  ["Demo Candidate 3", "demo.candidate3@example.com", ["Python", "SQL", "Pandas"], "Created data analysis pipelines with Python, SQL, and Pandas."],
  ["Demo Candidate 4", "demo.candidate4@example.com", ["Docker", "AWS", "Kubernetes"], "Automated Docker deployments on AWS and managed Kubernetes services."],
  ["Demo Candidate 5", "demo.candidate5@example.com", ["Figma", "UX Research", "Prototyping"], "Led UX research and built product prototypes in Figma."],
] as const;

const statuses = ["SUBMITTED", "RECRUITER_REVIEW", "SHORTLISTED", "REJECTED", "INTERVIEW"] as const;

async function main() {
  const passwordHash = await hash("DemoPass123!", 10);
  const recruiter = await prisma.user.findFirst({ where: { role: "RECRUITER" } });
  if (!recruiter) throw new Error("Create a recruiter account before seeding demo data.");

  for (let index = 0; index < jobs.length; index += 1) {
  const [title, department, location, requiredSkills] = jobs[index];
  await prisma.job.upsert({
    where: { id: `demo-job-${index + 1}` },
    update: {},
    create: {
      id: `demo-job-${index + 1}`,
      recruiterId: recruiter.id,
      title,
      department,
      location,
      employmentType: "Full-time",
      description: `${title.replace("Demo · ", "")} role for the demo workflow. Work with ${requiredSkills.join(", ")} to deliver reliable products.`,
      requiredSkills: JSON.stringify(requiredSkills),
      preferredSkills: JSON.stringify([]),
      qualifications: "Relevant degree or equivalent practical experience",
      experience: "2+ years",
    },
  });
  }

  for (let index = 0; index < candidates.length; index += 1) {
  const [name, email, skills, evidence] = candidates[index];
  const candidate = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role: "CANDIDATE", candidateProfile: { create: { extractedSkills: JSON.stringify(skills) } } },
  });
  const resume = await prisma.resume.upsert({
    where: { id: `demo-resume-${index + 1}` },
    update: {},
    create: {
      id: `demo-resume-${index + 1}`,
      candidateId: candidate.id,
      originalName: `demo-resume-${index + 1}.pdf`,
      mimeType: "application/pdf",
      storagePath: `demo/${index + 1}.pdf`,
      text: `${name}\nSkills\n${skills.join(", ")}\nExperience\n${evidence}\nEducation\nBachelor degree`,
      extractedData: JSON.stringify({
        name,
        email,
        location: "Pakistan",
        skills: skills.map((value) => ({ value, evidence: `${skills.join(", ")}` })),
        learningInterests: [],
        education: [{ value: "Bachelor degree", evidence: "Bachelor degree" }],
        experience: [{ value: evidence, evidence }],
        projects: [{ value: `${skills[0]} demo project`, evidence }],
      }),
      reviewedAt: new Date(),
    },
  });
  const jobId = `demo-job-${index + 1}`;
  const application = await prisma.application.upsert({
    where: { candidateId_jobId: { candidateId: candidate.id, jobId } },
    update: {},
    create: { candidateId: candidate.id, jobId, resumeId: resume.id, status: statuses[index] },
  });
  await prisma.auditEvent.create({ data: { applicationId: application.id, actorId: candidate.id, action: "DEMO_SEEDED", detail: "Demo application created for workflow testing." } });
  }

  console.log(`Seeded 5 demo jobs and 5 demo applications for recruiter ${recruiter.email}.`);
  console.log("Demo candidate password: DemoPass123!");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
