-- ビーコンの圏内になってもすぐには入室にせず、確認の時間の間は保留にする（前を通っただけの人を入室にしない）。
-- 保留を始めた時刻を記録し、確認の時間の間に圏外にならなければ、この時刻で入室を確定する。

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "enterPendingSince" TIMESTAMP(3);
