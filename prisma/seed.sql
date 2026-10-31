-- ローカル開発用のデータ（npm run db:seed で入れる。本番には入れない）
-- ログイン: dev@4nonome.com / local-dev-password
INSERT INTO "Office" ("code", "name", "updatedAt") VALUES
  ('OKAYAMA', '岡山オフィス', NOW()),
  ('TOKYO', '東京オフィス', NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "User" ("name", "email", "password", "iconFileName", "officeId")
SELECT '開発用ユーザー', 'dev@4nonome.com', '$2b$10$V/qla839GGX5T.JCgwxXrOnx6VFJDMa2/qo7NjI14ZBnWLyMRYMj.', '', "id"
FROM "Office" WHERE "code" = 'OKAYAMA'
ON CONFLICT ("email") DO NOTHING;
