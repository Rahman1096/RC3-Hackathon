-- AlterTable
ALTER TABLE "Job" ADD COLUMN "aiRequirements" TEXT;
ALTER TABLE "Job" ADD COLUMN "aiSourceHash" TEXT;
ALTER TABLE "Job" ADD COLUMN "embedding" TEXT;
ALTER TABLE "Job" ADD COLUMN "embeddingSourceHash" TEXT;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "embedding" TEXT;
ALTER TABLE "Resume" ADD COLUMN "embeddingSourceHash" TEXT;

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "guideline" TEXT NOT NULL,
    "evidence" TEXT,
    "sourceHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewQuestion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InterviewQuestion_applicationId_idx" ON "InterviewQuestion"("applicationId");
