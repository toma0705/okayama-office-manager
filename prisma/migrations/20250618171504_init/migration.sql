/*
  Warnings:

  - You are about to drop the column `entered` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `enteredAt` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Enter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "enteredAt" DATETIME NOT NULL,
    "exitAt" DATETIME,
    CONSTRAINT "Enter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iconFileName" TEXT NOT NULL,
    "password" TEXT NOT NULL
);
INSERT INTO "new_User" ("iconFileName", "id", "name", "password") SELECT "iconFileName", "id", "name", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
