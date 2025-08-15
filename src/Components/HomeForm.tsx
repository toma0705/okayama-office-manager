/**
 * ホーム画面のメインコンポーネント
 * ユーザーの入退室状況表示、入退室ボタン、入室中ユーザー一覧を管理
 */
'use client';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/declaration';
import Image from 'next/image';
import { useState, useEffect } from 'react';

type Props = {
  user: User | null;
  entered: boolean;
  onEnter: () => void;
  onExit: () => void;
  enteredUsers: User[];
  onReload: () => void;
  isUpdating: boolean;
};

const enterExitButtonStyle = {
  fontSize: 18,
  padding: 12,
  borderRadius: 8,
  color: '#fff',
  border: 'none',
  width: 120,
};

export default function HomeForm({
  user,
  entered,
  onEnter,
  onExit,
  enteredUsers,
  onReload,
  isUpdating,
}: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ユーザーノートの状態管理
  const [notes, setNotes] = useState<Record<number, string>>({});
  useEffect(() => {
    setNotes(Object.fromEntries(enteredUsers.map(u => [u.id, u.note ?? ''])));
  }, [enteredUsers]);

  // 現在編集中のユーザーID（自分のノートのみ編集可能）
  const [editNoteUserId, setEditNoteUserId] = useState<number | null>(null);

  const handleEnter = () => onEnter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    onExit();
    router.push('/login');
  };

  // ノート内容変更時の処理
  const handleNoteChange = (userId: number, value: string) => {
    setNotes(prev => ({ ...prev, [userId]: value }));
  };

  // ノート保存処理
  const handleNoteSave = async (userId: number) => {
    const note = notes[userId];
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    onReload(); // 編集後に最新状態を取得
    setEditNoteUserId(null); // 編集モードを終了
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('本当にアカウントを削除しますか？この操作は元に戻せません。')) return;
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    localStorage.removeItem('token');
    onReload();
    router.push('/login');
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: 24,
        maxWidth: 600,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#f7f7f7',
      }}
    >
      {/* ユーザーアイコン表示（右上、クリックでサイドバー開閉） */}
      {user && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            cursor: 'pointer',
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <Image
            src={
              user.iconFileName && user.iconFileName.startsWith('http')
                ? user.iconFileName
                : '/file.svg'
            }
            alt={user.name}
            width={72}
            height={72}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
              background: '#eee',
              aspectRatio: '1 / 1',
              display: 'block',
              border: '2px solid #7bc062',
            }}
          />
        </div>
      )}

      {/* サイドバー */}
      {sidebarOpen && user && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '50vw',
            maxWidth: 360,
            minWidth: 220,
            height: '100vh',
            background: '#fff',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 24,
            transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              fontSize: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              lineHeight: 1,
            }}
            aria-label="サイドバーを閉じる"
          >
            ×{/*この×ボタン,画像にすべき？*/}
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 32,
              marginBottom: 32,
            }}
          >
            <Image
              src={
                user.iconFileName && user.iconFileName.startsWith('http')
                  ? user.iconFileName
                  : '/file.svg'
              }
              alt={user.name}
              width={64}
              height={64}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                background: '#eee',
                border: '2px solid #7bc062',
                marginRight: 20,
              }}
            />
            <div style={{ fontSize: 22, fontWeight: 600 }}>{user.name}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 16,
              padding: '12px 24px',
              borderRadius: 8,
              background: '#fff',
              color: '#7bc062',
              border: '2px solid #7bc062',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: 16,
            }}
          >
            ログアウト
          </button>
          <button
            onClick={handleDeleteAccount}
            style={{
              fontSize: 16,
              padding: '12px 24px',
              borderRadius: 8,
              background: '#e53935',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            アカウント削除
          </button>
        </div>
      )}

      {/* 入退室状態表示 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 32,
          marginTop: 8,
          fontSize: 32,
          fontWeight: 700,
          color: entered ? '#7bc062' : '#e53935',
          letterSpacing: 2,
          transition: 'all 0.2s',
        }}
      >
        {entered ? '入室中' : '退出中'}
      </div>
      {/* 入退室ボタン */}
      <div
        style={{
          height: 56,
          margin: '0 auto 24px auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {!entered ? (
          <button
            onClick={handleEnter}
            disabled={isUpdating}
            style={{
              ...enterExitButtonStyle,
              background: isUpdating ? '#a5d6a7' : '#7bc062',
              opacity: isUpdating ? 0.7 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer',
            }}
          >
            {isUpdating ? '入室中...' : '入室'}
          </button>
        ) : (
          <button
            onClick={onExit}
            disabled={isUpdating}
            style={{
              ...enterExitButtonStyle,
              background: isUpdating ? '#ffab91' : '#e53935',
              opacity: isUpdating ? 0.7 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer',
            }}
          >
            {isUpdating ? '退室中...' : '退室'}
          </button>
        )}
      </div>
      {/* 入室中ユーザー一覧のヘッダー */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 24,
          minHeight: 112,
          transition: 'opacity 0.2s',
          opacity: 0,
          visibility: 'hidden',
          display: 'none',
        }}
      />

      {/* 入室中ユーザー一覧テーブル */}
      <div
        style={{
          marginTop: 0,
          height: '350px',
          overflowY: 'auto',
          borderRadius: 16,
        }}
      >
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'center',
            width: '100%',
            tableLayout: 'fixed',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#7bc062',
                  fontSize: 16,
                  color: '#f9fafb',
                  padding: '12px 8px',
                  minWidth: 120,
                  whiteSpace: 'nowrap',
                  wordBreak: 'keep-all',
                }}
              >
                入室中ユーザー
                <br />
                入室した時間
              </th>
              <th
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#7bc062',
                  fontSize: 20,
                  color: '#f9fafb',
                  padding: '12px 8px',
                  minWidth: 100,
                  whiteSpace: 'nowrap',
                  wordBreak: 'keep-all',
                }}
              >
                メモ・備考
              </th>
            </tr>
          </thead>
          <tbody>
            {enteredUsers.map(u => (
              <tr key={u.id}>
                <td
                  style={{
                    borderBottom: '2px solid #000000',
                    padding: '14px 18px',
                    fontSize: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px 0',
                    }}
                  >
                    <Image
                      src={
                        u.iconFileName && u.iconFileName.startsWith('http')
                          ? u.iconFileName
                          : '/file.svg'
                      }
                      alt={u.name}
                      width={32}
                      height={32}
                      style={{
                        borderRadius: 16,
                        marginRight: 8,
                        objectFit: 'cover',
                        background: '#eee',
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        if (target && target.src !== '/file.svg') {
                          target.src = '/file.svg';
                        }
                      }}
                    />
                    <span style={{ fontSize: 20 }}>{u.name}</span>
                  </div>
                  {u.enteredAt ? formatDateTime(u.enteredAt) : '-'}
                </td>
                <td
                  style={{
                    borderBottom: '2px solid #000000',
                    borderLeft: '2px solid #9ca3af',
                    padding: '14px 18px',
                    fontSize: 20,
                  }}
                >
                  {editNoteUserId === u.id && user?.id === u.id ? (
                    <>
                      <textarea
                        id={`note-${u.id}`}
                        value={notes[u.id] ?? ''}
                        onChange={e => handleNoteChange(u.id, e.target.value)}
                        rows={1}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          border: '1px solid #ccc',
                          padding: 12,
                          fontSize: 16,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                        placeholder="メモを残す"
                      />
                      <button
                        onClick={() => handleNoteSave(u.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: '#7bc062',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        保存
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{u.note}</span>
                        {user?.id === u.id && (
                          <button
                            onClick={() => setEditNoteUserId(u.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: '#1976d2',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            編集
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 日付と時間をフォーマットするヘルパー関数
function formatDateTime(dt: string | Date | undefined): string {
  if (!dt) return '-';
  const date = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(date.getTime())) return '-';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
