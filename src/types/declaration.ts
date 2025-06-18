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
  iconFileName: string;
  enteredAt?: string | null; // 入室時刻（ISO文字列 or null）を追加
};
