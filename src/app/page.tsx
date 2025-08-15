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
  const [user, setUser] = useState<User | null>(null);
  const [entered, setEntered] = useState(false);
  const [enteredUsers, setEnteredUsers] = useState<User[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
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
   * ユーザー入室処理（楽観的UI）
   */
  const onEnter = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user || isUpdating) return;

    setIsUpdating(true);
    setEntered(true);
    setEnteredUsers(prev => [...prev, { ...user, entered: true }]);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/enter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('入室処理に失敗しました');
      }

      fetchUserAndEnteredUsers();
    } catch (error) {
      setEntered(false);
      setEnteredUsers(prev => prev.filter(u => u.id !== user.id));
      console.error('入室エラー:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * ユーザー退室処理（楽観的UI）
   */
  const onExit = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user || isUpdating) return;

    setIsUpdating(true);
    setEntered(false);
    setEnteredUsers(prev => prev.filter(u => u.id !== user.id));

    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/exit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('退室処理に失敗しました');
      }

      fetchUserAndEnteredUsers();
    } catch (error) {
      setEntered(true);
      setEnteredUsers(prev => [...prev, { ...user, entered: true }]);
      console.error('退室エラー:', error);
    } finally {
      setIsUpdating(false);
    }
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
        isUpdating={isUpdating}
      />
    </div>
  );
};

export default Home;
