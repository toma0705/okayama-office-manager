/**
 * ユーザー登録ページ
 * 新規ユーザーの会員登録フォームを表示
 */
'use client';
import { useRouter } from 'next/navigation';
import Register from '@/Components/Register';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div>
      <Register onBack={() => router.push('/login')} />
    </div>
  );
}
