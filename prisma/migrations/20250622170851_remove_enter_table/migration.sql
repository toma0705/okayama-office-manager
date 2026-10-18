/*
  Warnings:

  - You are about to drop the `Enter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Enter" DROP CONSTRAINT "Enter_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "entered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enteredAt" TIMESTAMP(3),
ADD COLUMN     "exitedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Enter";
