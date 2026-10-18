-- CreateTable
CREATE TABLE "Office" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial offices
INSERT INTO "Office" ("code", "name")
VALUES ('OKAYAMA', '岡山オフィス'), ('TOKYO', '東京オフィス')
ON CONFLICT ("code") DO NOTHING;

-- Add officeId column to User
ALTER TABLE "User" ADD COLUMN "officeId" INTEGER;

-- Backfill existing users to Okayama office by default
UPDATE "User"
SET "officeId" = (SELECT "id" FROM "Office" WHERE "code" = 'OKAYAMA')
WHERE "officeId" IS NULL;

-- Make officeId required and enforce relational integrity
ALTER TABLE "User"
ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "User"
ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index for faster filtering by office
CREATE INDEX "User_officeId_idx" ON "User"("officeId");
