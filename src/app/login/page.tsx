/**
 * ログインページ
 * 認証済みユーザーはホームページにリダイレクト
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LoginForm from '@/Components/LoginForm';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  // 認証済みの場合はホームページへリダイレクト
  if (token) {
    redirect('/');
  }

  return (
    <div>
      <LoginForm />
    </div>
  );
}
