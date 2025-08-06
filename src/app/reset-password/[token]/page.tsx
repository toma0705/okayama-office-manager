/**
 * パスワードリセット実行ページコンポーネント
 *
 * 機能:
 * - トークンを使用した新しいパスワードの設定
 * - パスワード変更処理の実行
 * - 処理状態の視覚的フィードバック
 * - エラーハンドリングとユーザー通知
 *
 * @returns {JSX.Element} パスワードリセット実行フォーム
 */
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function ResetPasswordTokenPage() {
  // フォーム状態管理
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // URLパラメータからトークンを取得
  // URLパラメータからトークンを取得
  const params = useParams();
  const token = params?.token as string;

  /**
   * パスワードリセットフォーム送信処理
   * トークンと新しいパスワードをAPIに送信してパスワードを更新
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/users/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setMessage('パスワードがリセットされました。ログイン画面から再度ログインしてください。');
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'リセットに失敗しました');
      }
    } catch (error) {
      setMessage('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '60px auto',
        padding: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        新しいパスワード設定
      </h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          新しいパスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #ccc',
            marginBottom: 20,
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 8,
            background: '#7bc062',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'リセット中...' : 'パスワードをリセット'}
        </button>
      </form>
      {message && (
        <div
          style={{
            marginTop: 24,
            color: message.includes('リセットされました') ? '#7bc062' : '#e53935',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {message}
        </div>
      )}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <a
          href="/login"
          style={{
            color: '#7bc062',
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          ログイン画面へ戻る
        </a>
      </div>
    </div>
  );
}
