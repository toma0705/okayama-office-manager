// JWTのペイロード型定義
export type JwtPayload = {
  id: number;
  name: string;
  iconFileName: string;
  iat?: number;
  exp?: number;
};

// 共通User型
export type User = {
  id: number;
  name: string;
  email: string;
  iconFileName: string;
  entered: boolean; // 入室中かどうか
  enteredAt?: string | null; // 入室時刻（ISO文字列 or null）を追加
  exitedAt?: string | null; // 退室時刻（ISO文字列 or null）を追加
  note?: string | null; // ユーザーノート（null許容）
};
