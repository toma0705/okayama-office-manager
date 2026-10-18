-- GPS による入退室判定をやめ、ビーコン検知にしたため不要になった列を削除する。
-- 本番には、リポジトリにないマイグレーションで追加された列（radiusMeters）や、
-- schema.prisma から先に消えていた列（User.lastLocationAt）があるため IF EXISTS で削除する。

-- AlterTable
ALTER TABLE "Office" DROP COLUMN IF EXISTS "latitude",
DROP COLUMN IF EXISTS "longitude",
DROP COLUMN IF EXISTS "radiusMeters";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastLocationAt";
