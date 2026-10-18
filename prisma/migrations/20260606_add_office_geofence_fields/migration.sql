-- 元のファイルが失われたため作り直したもの（2026-10 にリポジトリへ追加）。
-- 本番では、元の SQL が「latitude 列がすでにある」で失敗し、SQL を実行しないまま
-- 適用済みとして記録された。radiusMeters 列は別の方法で追加されている。
-- 新しい環境で最初から適用しても失敗せず、本番と同じ列構成になるようにしている。
-- （これらの列は 20261018000000_remove_gps_fields で削除される）

-- AlterTable
ALTER TABLE "Office" ADD COLUMN IF NOT EXISTS "radiusMeters" INTEGER;
