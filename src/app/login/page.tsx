'use client';
/**
 * ログインページ
 * - Path: /login
 * - 概要: メール・パスワードでログインし、JWT を保存してホームに遷移
 * - API: POST /api/users/login（成功したらトークンを localStorage に保存）
 * - Auth: 公開（未ログイン利用）
 */
import { PageContainer } from '@/components/layouts/PageContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { authToken, readApiError, sendJson } from '@/lib/client/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (authToken.get()) router.replace('/');
  }, [router]);

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await sendJson('/users/login', 'POST', {
        email: email.trim(),
        password: password.trim(),
      });
      if (res.ok) {
        const { token } = await res.json();
        authToken.set(token);
        router.push('/');
      } else {
        const { error } = await readApiError(res);
        alert(error || 'メールアドレスまたはパスワードが違います');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer className='items-center justify-center gap-10 py-10 sm:py-0'>
      <form className='flex w-full max-w-sm flex-col gap-4' onSubmit={handleLogin}>
        <Input
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder='メールアドレス'
        />
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder='パスワード'
        />
        <Button type='submit' disabled={loading}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </Button>
        <Button type='button' variant='secondary' onClick={() => router.push('/register')}>
          新規登録
        </Button>
      </form>
      <div className='mt-4 flex w-full max-w-sm flex-col gap-2'>
        <LinkButton href='/reset-password' center>
          パスワードをお忘れの方はこちら
        </LinkButton>
      </div>
    </PageContainer>
  );
}
