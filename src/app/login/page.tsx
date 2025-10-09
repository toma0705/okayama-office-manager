'use client';
/**
 * ログインページ
 * - Path: /login
 * - 概要: メール・パスワードでログインし、JWT を保存してホームに遷移
 * - API: POST /api/users/login （成功時: { token } を localStorage に保存）
 * - Auth: 公開（未ログイン利用）
 */
import { PageContainer } from '@/Components/layouts/PageContainer';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';
import { LinkButton } from '@/Components/ui/LinkButton';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/');
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('token', token);
        router.push('/');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'メールアドレスまたはパスワードが違います');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Input
        type='email'
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder='メールアドレス'
        className='mb-4'
      />
      <Input
        type='password'
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder='パスワード'
        className='mb-4'
      />
      <Button onClick={handleLogin} disabled={loading} className='mb-3'>
        {loading ? 'ログイン中...' : 'ログイン'}
      </Button>
      <Button variant='secondary' onClick={() => router.push('/register')}>
        新規登録
      </Button>
      <LinkButton href='/reset-password' center className='mt-3'>
        パスワードをお忘れの方はこちら
      </LinkButton>
    </PageContainer>
  );
}
