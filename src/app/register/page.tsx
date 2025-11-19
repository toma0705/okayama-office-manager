'use client';
/**
 * ユーザー登録ページ
 * - Path: /register
 * - 概要: オフィスを選んで新規ユーザーを作成（アイコン画像アップロード対応）
 * - API: GET /api/offices, POST /api/users
 * - Auth: 公開（管理者が最初に利用する想定も可）
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/Components/layouts/PageContainer';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';
import { Avatar } from '@/Components/ui/Avatar';
import type { Office } from '@/types/declaration';
import { API_BASE_URL } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [offices, setOffices] = useState<Office[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [officeCode, setOfficeCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [officeTouched, setOfficeTouched] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const officesRes = await fetch(`${API_BASE_URL}/offices`);
        const officesData = await officesRes.json();
        if (Array.isArray(officesData)) {
          setOffices(officesData);
        }
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
    if (!name || !email || !password || !iconFile || !officeCode) {
      setOfficeTouched(true);
      if (!name || !email || !password) alert('名前・メールアドレス・パスワードは必須です');
      else if (!iconFile) alert('アイコン画像の選択は必須です');
      else alert('所属オフィスの選択は必須です');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('icon', iconFile);
      formData.append('password', password);
      formData.append('officeCode', officeCode);
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
      setOfficeCode('');
      setOfficeTouched(false);
    } catch (err) {
      setErrorMessage('ユーザー追加時にエラーが発生しました');
      console.error(err);
    }
  };

  return (
    <PageContainer className='justify-start'>
      <h1 className='text-center mb-6 text-2xl'>新規ユーザー登録</h1>
      <div className='flex flex-col gap-2 mb-4'>
        <select
          value={officeCode}
          onChange={e => setOfficeCode(e.target.value)}
          className='w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-[#7bc062] focus:outline-none'
          disabled={offices.length === 0}
        >
          <option value='' disabled>
            {offices.length === 0 ? 'オフィス情報を読み込み中…' : 'オフィスを選択してください'}
          </option>
          {offices.map(option => (
            <option key={option.id} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        {offices.length === 0 && (
          <span className='text-xs text-gray-500'>
            オフィス情報の取得が完了するまでお待ちください
          </span>
        )}
        {officeTouched && officeCode === '' && offices.length > 0 && (
          <span className='text-xs text-red-600'>オフィスを選択してください</span>
        )}
      </div>

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
