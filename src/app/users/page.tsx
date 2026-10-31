/**
 * ユーザー一覧ページ
 * - URL: /users
 * - 概要: 登録されているユーザーの一覧を表示
 * - API: GET /api/users
 * - Auth: 必須（未ログインなら /login へ）
 */

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layouts/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import type { Office, User } from '@/types/api';
import { apiFetch, authToken } from '@/lib/client/api';
import { Button } from '@/components/ui/Button';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<number | 'ALL'>('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      selectedOffice === 'ALL' ? true : user.office?.id === selectedOffice,
    );
  }, [users, selectedOffice]);

  useEffect(() => {
    if (!authToken.get()) {
      router.push('/login');
      return;
    }
    (async () => {
      try {
        const [usersRes, officesRes] = await Promise.all([
          apiFetch('/users'),
          apiFetch('/offices'),
        ]);
        if (usersRes.status === 401) {
          authToken.clear();
          router.push('/login');
          return;
        }
        const usersData = await usersRes.json();
        const officesData = await officesRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
        setOffices(Array.isArray(officesData) ? officesData : []);
      } catch (error) {
        console.error('ユーザーリストの取得に失敗しました', error);
      }
    })();
  }, [router]);

  return (
    <PageContainer className='items-start gap-6'>
      <div className='w-full flex items-center'>
        <Button variant='secondary' onClick={() => router.push('/')} className='px-4'>
          ← ホームに戻る
        </Button>
      </div>

      <div className='w-full flex justify-center'>
        <h1 className='text-2xl font-bold text-center'>ユーザーリスト</h1>
      </div>

      <div className='flex flex-wrap gap-4 w-full bg-white rounded-xl shadow p-4'>
        <div className='flex flex-col gap-2 w-full sm:w-64'>
          <label className='text-sm font-semibold text-gray-700'>オフィスで絞り込み</label>
          <select
            value={selectedOffice}
            onChange={e =>
              setSelectedOffice(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-[#7bc062] focus:outline-none'
          >
            <option value='ALL'>すべてのオフィス</option>
            {offices.map(office => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='w-full h-[430px] overflow-y-auto rounded-xl bg-white shadow overflow-hidden'>
        <table className='w-full table-auto border-collapse'>
          <thead className='sticky top-0 bg-[#7bc062] text-white text-left text-sm uppercase tracking-wide'>
            <tr>
              <th className='px-4 py-3 text-center'>アイコン</th>
              <th className='px-4 py-3'>名前</th>
              <th className='px-4 py-3'>所属オフィス</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className='px-4 py-10 text-center text-gray-500'>
                  条件に一致するユーザーがいません
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className='border-t border-gray-200 hover:bg-[#f8faf6]'>
                  <td className='px-4 py-3'>
                    <div className='flex justify-center'>
                      <Avatar src={user.iconFileName} alt={user.name} size={40} />
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-900 font-semibold'>{user.name}</td>
                  <td className='px-4 py-3 text-sm text-gray-800'>
                    {user.office?.name ?? '未設定'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
