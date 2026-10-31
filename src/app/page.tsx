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
import Link from 'next/link';
import type { User } from '@/types/api';
import { PageContainer } from '@/components/layouts/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import { StatusTitle } from '@/components/home/StatusTitle';
import { EnterExitButtons } from '@/components/home/EnterExitButtons';
import { EnteredUsersTable } from '@/components/home/EnteredUsersTable';
import { UserSidebar } from '@/components/home/UserSidebar';
import { apiFetch, authToken, notify, sendJson } from '@/lib/client/api';

type AttendanceAction = 'enter' | 'exit';

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 入退室の記録中は、ボタンを押せないようにする
  const [pendingAction, setPendingAction] = useState<AttendanceAction | null>(null);
  const router = useRouter();
  const entered = Boolean(user?.entered);

  const logout = useCallback(() => {
    authToken.clear();
    router.push('/login');
  }, [router]);

  const fetchUserAndEnteredUsers = useCallback(async () => {
    if (!authToken.get()) {
      router.push('/login');
      return;
    }
    try {
      const res = await apiFetch('/users/me');
      if (!res.ok) throw new Error('failed to fetch');
      const data = await res.json();
      setUser(data.user);
      setEnteredUsers(data.enteredUsers || []);
    } catch {
      logout();
    }
  }, [logout, router]);

  useEffect(() => {
    const load = async () => {
      await fetchUserAndEnteredUsers();
    };
    void load();
  }, [fetchUserAndEnteredUsers]);

  const changeAttendance = async (action: AttendanceAction) => {
    if (!user || pendingAction) return;
    const previousUser = user;
    setPendingAction(action);
    // 押した直後に表示を切り替え、失敗したら元に戻す
    setUser(
      action === 'enter' ? { ...user, entered: true } : { ...user, entered: false, note: null },
    );
    try {
      const res = await apiFetch(`/users/${user.id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`${action} failed`);
      await notify(action === 'enter' ? '入室' : '退室');
      await fetchUserAndEnteredUsers();
    } catch {
      setUser(previousUser);
    } finally {
      setPendingAction(null);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('本当にアカウントを削除しますか？この操作は元に戻せません。')) return;
    await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
    logout();
  };

  const saveNote = async (userId: number, note: string) => {
    const response = await sendJson(`/users/${userId}`, 'PATCH', { note });
    if (!response.ok) throw new Error('Failed to save note');

    // 自分のメモが変わったときだけ Discord に流す
    const trimmedNote = note.trim();
    if (user && user.id === userId && trimmedNote && trimmedNote !== (user.note ?? '').trim()) {
      await notify('メモを追加', trimmedNote);
    }
    await fetchUserAndEnteredUsers();
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
          onLogout={logout}
          onDelete={deleteAccount}
        />
      )}

      {user && (
        <div className='rounded-full bg-[#e8f5e9] text-[#388e3c] px-4 py-1 text-sm font-semibold mb-4 shadow-sm border border-[#c8e6c9]'>
          {user.office.name}で表示中
        </div>
      )}

      <StatusTitle entered={entered} />
      <EnterExitButtons
        entered={entered}
        onEnter={() => changeAttendance('enter')}
        onExit={() => changeAttendance('exit')}
        disabled={pendingAction !== null}
      />
      <div className='mb-6'>
        <Link
          href='/users'
          className='inline-flex items-center gap-2 rounded-lg border border-[#7bc062] bg-white px-4 py-2 text-sm font-semibold text-[#388e3c] shadow-sm hover:bg-[#f0f8f4] transition-colors'
        >
          すべてのユーザーを見る
        </Link>
      </div>
      <EnteredUsersTable me={user} users={enteredUsers} onSaveNote={saveNote} />
    </PageContainer>
  );
};

export default Home;
