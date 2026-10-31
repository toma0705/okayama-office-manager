'use client';
/**
 * パスワード再設定ページ（トークン）
 * - Path: /reset-password/[token]
 * - 概要: トークンと新パスワードを送信してパスワードを更新
 * - API: POST /api/users/reset-password/[token]
 * - Auth: 公開（リンク所持者のみ実質アクセス）
 */
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CardLayout } from '@/components/layouts/CardLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { readApiError, sendJson } from '@/lib/client/api';

export default function ResetPasswordTokenPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const token = params?.token as string;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await sendJson(`/users/reset-password/${token}`, 'POST', { password });
    setLoading(false);
    if (res.ok) {
      setMessage('パスワードがリセットされました。ログイン画面から再度ログインしてください。');
    } else {
      const { error } = await readApiError(res);
      setMessage(error || 'リセットに失敗しました');
    }
  };

  return (
    <CardLayout>
      <h2 className='text-center text-[28px] font-bold mb-6'>新しいパスワード設定</h2>
      <form onSubmit={handleSubmit}>
        <label className='block font-semibold mb-2'>新しいパスワード</label>
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className='mb-5'
        />
        <Button type='submit' disabled={loading} fullWidth>
          {loading ? 'リセット中...' : 'パスワードをリセット'}
        </Button>
      </form>
      {message && (
        <div
          className={`mt-6 font-semibold text-center ${
            message.includes('リセットされました') ? 'text-[#7bc062]' : 'text-[#e53935]'
          }`}
        >
          {message}
        </div>
      )}
      <div className='mt-8 text-center'>
        <a href='/login' className='text-[#7bc062] underline font-semibold'>
          ログイン画面へ戻る
        </a>
      </div>
    </CardLayout>
  );
}
