-- ピン留めした在室ボードを書き換える方式をやめ、入退室の通知に在室状況を添えるようにしたため、
-- ボードのメッセージ ID は不要になった。

-- AlterTable
ALTER TABLE "Office" DROP COLUMN IF EXISTS "discordBoardMessageId";
