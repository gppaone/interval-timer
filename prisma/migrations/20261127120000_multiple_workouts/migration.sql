-- A user can now have several routines (workouts): the one-per-user unique
-- index becomes an ordinary index.
-- DropIndex
DROP INDEX "Routine_userId_key";

-- CreateIndex
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastRoutineId" INTEGER;
