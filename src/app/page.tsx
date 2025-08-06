/**
 * ホームページコンポーネント
 * 認証済みユーザー向けのメインダッシュボード
 * オフィスの入退室状態管理を行う
 */
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HomeForm from '@/Components/HomeForm';
import type { User } from '@/types/declaration';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const Home = () => {
  // 状態管理
  const [user, setUser] = useState<User | null>(null);
  const [entered, setEntered] = useState(false);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const router = useRouter();

  /**
   * ユーザープロフィールと現在入室中ユーザー一覧を取得
   */
  const fetchUserAndEnteredUsers = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        setEnteredUsers(data.enteredUsers || []);
        setEntered(data.user.entered);
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      });
  }, [router]);

  useEffect(() => {
    fetchUserAndEnteredUsers();
  }, [fetchUserAndEnteredUsers]);

  /**
   * ユーザー入室処理
   */
  const onEnter = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    await fetch(`${API_BASE_URL}/users/${user.id}/enter`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUserAndEnteredUsers();
  };

  /**
   * ユーザー退室処理
   */
  const onExit = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    await fetch(`${API_BASE_URL}/users/${user.id}/exit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUserAndEnteredUsers();
  };

  return (
    <div>
      <HomeForm
        user={user}
        entered={entered}
        onEnter={onEnter}
        onExit={onExit}
        enteredUsers={enteredUsers}
        onReload={fetchUserAndEnteredUsers}
      />
    </div>
  );
};

export default Home;
