/**
 * API の応答の型（Web 画面で使う）。JSON なので日時は文字列になる。
 * サーバー側の型は Prisma が schema.prisma から生成する（@/generated/prisma/client）。
 */

export type Office = {
  id: number;
  code: string;
  name: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  /** 表示に使える画像の URL */
  iconFileName: string;
  officeId: number;
  office: Office;
  entered: boolean;
  enteredAt?: string | null;
  exitedAt?: string | null;
  note?: string | null;
};
