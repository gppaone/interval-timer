-- Baseline: the schema as it was when it was created with `prisma db push`.
-- Existing databases are marked as having applied this by scripts/baseline.mjs;
-- brand new databases run it normally.

-- CreateTable
CREATE TABLE "Routine" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'My Daily Routine',
    "intervals" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
