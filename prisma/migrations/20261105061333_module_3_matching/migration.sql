-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "error" TEXT;
ALTER TABLE "Assessment" ADD COLUMN "experienceScore" REAL;
ALTER TABLE "Assessment" ADD COLUMN "projectScore" REAL;
ALTER TABLE "Assessment" ADD COLUMN "qualificationScore" REAL;
ALTER TABLE "Assessment" ADD COLUMN "semanticScore" REAL;
ALTER TABLE "Assessment" ADD COLUMN "skillScore" REAL;
ALTER TABLE "Assessment" ADD COLUMN "sourceHash" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "skillEmbeddings" TEXT;
ALTER TABLE "Job" ADD COLUMN "skillEmbeddingsHash" TEXT;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "excerptIndex" TEXT;
ALTER TABLE "Resume" ADD COLUMN "excerptIndexHash" TEXT;

-- CreateTable
CREATE TABLE "RecruiterNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruiterNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruiterNote_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecruiterNote_applicationId_createdAt_idx" ON "RecruiterNote"("applicationId", "createdAt");
