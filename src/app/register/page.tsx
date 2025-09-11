'use client';
/**
 * ユーザー登録ページ
 * - Path: /register
 * - 概要: ユーザー一覧の表示と新規ユーザー作成（アイコン画像アップロード対応）
 * - API: GET /api/users, POST /api/users
 * - Auth: 公開（管理者が最初に利用する想定も可）
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/Components/layouts/PageContainer';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';
import { Avatar } from '@/Components/ui/Avatar';
import type { User } from '@/types/declaration';
import { API_BASE_URL } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const iconPreviewUrl = useMemo(
    () => (iconFile ? URL.createObjectURL(iconFile) : undefined),
    [iconFile],
  );
  useEffect(() => {
    return () => {
      if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl);
    };
  }, [iconPreviewUrl]);

  const addUser = async () => {
    setErrorMessage('');
    if (!name || !email || !password || !iconFile) {
      if (!name || !email || !password) alert('名前・メールアドレス・パスワードは必須です');
      else alert('アイコン画像の選択は必須です');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('icon', iconFile);
      formData.append('password', password);
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        router.push('/login');
      } else {
        const data = await res.json();
        if (res.status === 409 && data?.error === 'このメールアドレスは既に登録されています') {
          setErrorMessage('既に同じメールアドレスが存在しています');
        } else {
          setErrorMessage('ユーザー追加に失敗しました');
        }
      }
      setName('');
      setEmail('');
      setIconFile(null);
      setPassword('');
    } catch (err) {
      setErrorMessage('ユーザー追加時にエラーが発生しました');
      console.error(err);
    }
  };

  return (
    <PageContainer className='justify-start'>
      <h1 className='text-center mb-6 text-2xl'>ユーザー一覧</h1>
      <ul className='list-none p-0 mb-6'>
        {users.map(u => (
          <li key={u.id} className='flex items-center gap-3 mb-3 bg-white rounded-xl p-2 shadow-sm'>
            <Avatar alt={u.name} src={u.iconFileName} size={40} />
            <span className='text-lg'>{u.name}</span>
          </li>
        ))}
      </ul>

      <Input
        placeholder='名前を入力'
        value={name}
        onChange={e => setName(e.target.value)}
        className='mb-4'
      />
      <Input
        placeholder='メールアドレス'
        type='email'
        value={email}
        onChange={e => setEmail(e.target.value)}
        className='mb-4'
      />
      <Input
        placeholder='パスワード'
        type='password'
        value={password}
        onChange={e => setPassword(e.target.value)}
        className='mb-4'
      />

      <label
        htmlFor='icon-upload'
        className='block mb-4 py-3 border-2 border-dashed border-[#7bc062] rounded-lg bg-[#f0f8f4] text-[#7bc062] text-center cursor-pointer font-semibold'
      >
        {iconFile ? `選択済み: ${iconFile.name}` : 'アイコン画像を選択（必須）'}
        <input
          id='icon-upload'
          type='file'
          accept='image/*'
          onChange={e => setIconFile(e.target.files ? e.target.files[0] : null)}
          className='hidden'
        />
        {iconFile && (
          <div className='mt-4 flex justify-center'>
            <Avatar alt='icon preview' src={iconPreviewUrl} size={80} />
          </div>
        )}
      </label>
      {errorMessage && (
        <div className='text-[#d32f2f] mb-3 text-center font-semibold'>{errorMessage}</div>
      )}

      <Button onClick={addUser} className='mb-2'>
        追加
      </Button>
      <Button variant='secondary' onClick={() => router.push('/login')}>
        ログイン画面に戻る
      </Button>
    </PageContainer>
  );
}
