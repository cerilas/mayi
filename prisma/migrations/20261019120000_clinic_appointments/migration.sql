-- CreateTable
CREATE TABLE IF NOT EXISTS "ClinicAppointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'picker',
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicAppointment_startsAt_idx" ON "ClinicAppointment"("startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicAppointment_userId_startsAt_idx" ON "ClinicAppointment"("userId", "startsAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
