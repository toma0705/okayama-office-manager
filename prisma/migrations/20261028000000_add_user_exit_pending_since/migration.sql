-- ビーコンの圏外になってもすぐには退室にせず、猶予の間は保留にする。
-- 保留を始めた時刻を記録し、猶予の間に戻らなければ退室を確定する。

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "exitPendingSince" TIMESTAMP(3);
