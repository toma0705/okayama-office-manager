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

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [entered, setEntered] = useState(false);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'enter' | 'exit'>(null);
  const [apiSuccess, setApiSuccess] = useState(false);
  const router = useRouter();

  const fetchUserAndEnteredUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
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
    setPendingAction('enter');
    setEntered(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user.id}/enter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('enter failed');

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.name, status: '入室' }),
      });

      setApiSuccess(true);
      fetchUserAndEnteredUsers();
    } catch (e) {
      setEntered(prev);
      setIsPending(false);
      setPendingAction(null);
      setApiSuccess(false);
    }
  };

  const onExit = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    const prev = entered;
    if (isPending) return;
    setIsPending(true);
    setPendingAction('exit');
    setEntered(false);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user.id}/exit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('exit failed');

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.name, status: '退室' }),
      });

      setApiSuccess(true);
      fetchUserAndEnteredUsers();
    } catch (e) {
      setEntered(prev);
      setIsPending(false);
      setPendingAction(null);
      setApiSuccess(false);
    }
  };

  useEffect(() => {
    if (!isPending || !user || !pendingAction) return;
    const exists = enteredUsers.some(u => u.id === user.id);
    if (pendingAction === 'enter' && apiSuccess && exists) {
      setIsPending(false);
      setPendingAction(null);
      setApiSuccess(false);
    }
    if (pendingAction === 'exit' && apiSuccess && !exists) {
      setIsPending(false);
      setPendingAction(null);
      setApiSuccess(false);
    }
  }, [isPending, pendingAction, enteredUsers, user, apiSuccess]);

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

      {user && (
        <div className='rounded-full bg-[#e8f5e9] text-[#388e3c] px-4 py-1 text-sm font-semibold mb-4 shadow-sm border border-[#c8e6c9]'>
          {user.office.name}で表示中
        </div>
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
