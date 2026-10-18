/**
 * Office Managerアプリケーションの型定義
 */

/**
 * JWTペイロードの構造
 */
export type OfficeCode = 'OKAYAMA' | 'TOKYO';

export type Office = {
  id: number;
  code: OfficeCode;
  name: string;
};

export type JwtPayload = {
  id: number;
  name: string;
  iconFileName: string;
  officeId: number;
  officeCode: OfficeCode;
  iat?: number;
  exp?: number;
};

/**
 * 自動入退室専用トークンの中身。入室・退室・在室状態の確認にしか使えない
 */
export type AttendanceJwtPayload = {
  id: number;
  scope: 'attendance';
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
  officeId: number;
  office: Office;
  entered: boolean;
  enteredAt?: string | null;
  exitedAt?: string | null;
  note?: string | null;
};
