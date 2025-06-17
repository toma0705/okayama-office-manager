-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iconFileName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "entered" BOOLEAN NOT NULL DEFAULT false,
    "enteredAt" DATETIME
);
