-- CreateTable
CREATE TABLE "PostureInsightOverride" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "insightKey" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION NOT NULL,
    "clinicianScore" DOUBLE PRECISION NOT NULL,
    "clinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostureInsightOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostureInsightOverrideHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "insightKey" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "clinicianScore" DOUBLE PRECISION NOT NULL,
    "clinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostureInsightOverrideHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostureInsightOverride_sessionId_idx" ON "PostureInsightOverride"("sessionId");

-- CreateIndex
CREATE INDEX "PostureInsightOverride_clinicianId_idx" ON "PostureInsightOverride"("clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "PostureInsightOverride_sessionId_insightKey_key" ON "PostureInsightOverride"("sessionId", "insightKey");

-- CreateIndex
CREATE INDEX "PostureInsightOverrideHistory_sessionId_insightKey_idx" ON "PostureInsightOverrideHistory"("sessionId", "insightKey");

-- CreateIndex
CREATE INDEX "PostureInsightOverrideHistory_clinicianId_idx" ON "PostureInsightOverrideHistory"("clinicianId");

-- AddForeignKey
ALTER TABLE "PostureInsightOverride" ADD CONSTRAINT "PostureInsightOverride_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PostureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostureInsightOverride" ADD CONSTRAINT "PostureInsightOverride_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostureInsightOverrideHistory" ADD CONSTRAINT "PostureInsightOverrideHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PostureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostureInsightOverrideHistory" ADD CONSTRAINT "PostureInsightOverrideHistory_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
