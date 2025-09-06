'use client';
/**
 * パスワード再設定申請ページ
 * - Path: /reset-password
 * - 概要: 登録メール宛にパスワード再設定メールを送信
 * - API: POST /api/users/reset-password-request
 * - Auth: 公開
 */
import { useState } from 'react';
import { CardLayout } from '@/Components/layouts/CardLayout';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/users/reset-password-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage('パスワード再設定用のメールを送信しました。メールをご確認ください。');
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err.error || '送信に失敗しました');
    }
  };

  return (
    <CardLayout>
      <h2 className='text-center text-[28px] font-bold mb-6'>パスワード再設定</h2>
      <form onSubmit={handleSubmit}>
        <label className='block font-semibold mb-2'>登録メールアドレス</label>
        <Input
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className='mb-5'
        />
        <Button type='submit' disabled={loading} fullWidth>
          {loading ? '送信中...' : '再設定メールを送信'}
        </Button>
      </form>
      {message && (
        <div
          className={`mt-6 font-semibold text-center ${
            message.includes('送信しました') ? 'text-[#7bc062]' : 'text-[#e53935]'
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
