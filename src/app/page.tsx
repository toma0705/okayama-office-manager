/**
 * ホーム（ダッシュボード）
 * - Path: /
 * - 概要: 認証ユーザー向けダッシュボード。入退室の操作と入室中一覧を表示
 * - API: GET /api/users/me, POST /api/users/[id]/enter, POST /api/users/[id]/exit, PATCH /api/users/[id]
 * - Auth: 必須（Bearer JWT）
 */
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/declaration';
import { PageContainer } from '@/Components/layouts/PageContainer';
import { Avatar } from '@/Components/ui/Avatar';
import { StatusTitle } from '@/Components/home/StatusTitle';
import { EnterExitButtons } from '@/Components/home/EnterExitButtons';
import { EnteredUsersTable } from '@/Components/home/EnteredUsersTable';
import { UserSidebar } from '@/Components/home/UserSidebar';
import { API_BASE_URL } from '@/lib/config';

const API_BASE_URL_FALLBACK = process.env.NEXT_PUBLIC_API_URL;

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [entered, setEntered] = useState(false);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const fetchUserAndEnteredUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL || API_BASE_URL_FALLBACK}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('failed to fetch');
      const data = await res.json();
      setUser(data.user);
      setEnteredUsers(data.enteredUsers || []);
      setEntered(Boolean(data.user?.entered));
    } catch {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      await fetchUserAndEnteredUsers();
    })();
  }, [fetchUserAndEnteredUsers]);

  const onEnter = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    const prev = entered;
    if (isPending) return;
    setIsPending(true);
    setEntered(true);
    try {
      const res = await fetch(`${API_BASE_URL || API_BASE_URL_FALLBACK}/users/${user.id}/enter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('enter failed');
      fetchUserAndEnteredUsers();
    } catch (e) {
      setEntered(prev);
    } finally {
      setIsPending(false);
    }
  };

  const onExit = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    const prev = entered;
    if (isPending) return;
    setIsPending(true);
    setEntered(false);
    try {
      const res = await fetch(`${API_BASE_URL || API_BASE_URL_FALLBACK}/users/${user.id}/exit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('exit failed');
      fetchUserAndEnteredUsers();
    } catch (e) {
      setEntered(prev);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <PageContainer className='items-start'>
      {user && (
        <button
          className='absolute top-4 right-4 w-[72px] h-[72px] z-20 cursor-pointer flex items-center justify-center'
          onClick={() => setSidebarOpen(true)}
          aria-label='ユーザメニュー'
        >
          {user.iconFileName ? (
            <Avatar
              alt={user.name}
              src={user.iconFileName}
              size={72}
              className='border-2 border-[#7bc062]'
            />
          ) : (
            <div className='w-[72px] h-[72px] rounded-full border-2 border-[#7bc062] bg-gray-200' />
          )}
        </button>
      )}

      {sidebarOpen && (
        <UserSidebar
          user={user}
          onClose={() => setSidebarOpen(false)}
          onLogout={() => {
            localStorage.removeItem('token');
            onExit();
            router.push('/login');
          }}
          onDelete={async () => {
            if (!user) return;
            if (!window.confirm('本当にアカウントを削除しますか？この操作は元に戻せません。'))
              return;
            await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            localStorage.removeItem('token');
            await fetchUserAndEnteredUsers();
            router.push('/login');
          }}
        />
      )}

      <StatusTitle entered={entered} />
      <EnterExitButtons entered={entered} onEnter={onEnter} onExit={onExit} disabled={isPending} />
      <EnteredUsersTable
        me={user}
        users={enteredUsers}
        onSaveNote={async (userId, note) => {
          await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
          });
          await fetchUserAndEnteredUsers();
        }}
      />
    </PageContainer>
  );
};

export default Home;
