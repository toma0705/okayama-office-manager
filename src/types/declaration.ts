/**
 * Office Managerアプリケーションの型定義
 */

/**
 * JWTペイロードの構造
 */
export type JwtPayload = {
  id: number;
  name: string;
  iconFileName: string;
  iat?: number;
  exp?: number;
};

/**
 * ユーザーエンティティの型
 */
export type User = {
  id: number;
  name: string;
  email: string;
  iconFileName: string;
  entered: boolean;
  enteredAt?: string | null;
  exitedAt?: string | null;
  note?: string | null;
};
