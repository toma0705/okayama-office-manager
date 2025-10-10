'use client';
import { Avatar } from '@/Components/ui/Avatar';
import type { User } from '@/types/declaration';
import { formatDateTime } from '@/utils/date';
import { useState, useEffect } from 'react';

type Props = {
  me: User | null;
  users: User[];
  onSaveNote: (userId: number, note: string) => Promise<void> | void;
};

export function EnteredUsersTable({ me, users, onSaveNote }: Props) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    setNotes(Object.fromEntries(users.map(u => [u.id, u.note ?? ''])));
  }, [users]);

  const handleSave = async (id: number) => {
    await onSaveNote(id, notes[id] ?? '');
    setEditingId(null);
  };

  return (
    <div className='mt-0 h-[350px] overflow-y-auto rounded-2xl'>
      <table className='border-separate border-spacing-0 text-center w-full table-fixed shadow-md'>
        <thead>
          <tr>
            <th className='sticky top-0 z-[2] bg-[#7bc062] text-white p-3 min-w-[180px] whitespace-nowrap'>
              入室中ユーザー
              <br />
              入室した時間
            </th>
            <th className='sticky top-0 z-[2] bg-[#7bc062] text-white p-3 min-w-[160px] whitespace-nowrap'>
              メモ・備考
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className='border-b-2 border-black p-4 text-lg'>
                <div className='flex items-center justify-center my-1'>
                  <Avatar
                    alt={u.name}
                    src={u.iconFileName}
                    size={32}
                    rounded={false}
                    className='rounded-lg mr-2'
                  />
                  <span className='text-lg'>{u.name}</span>
                </div>
                {u.enteredAt ? formatDateTime(u.enteredAt) : '-'}
              </td>
              <td className='border-b-2 border-b-black border-l-2 border-l-gray-400 p-4 text-lg'>
                {editingId === u.id && me?.id === u.id ? (
                  <>
                    <textarea
                      value={notes[u.id] ?? ''}
                      onChange={e => setNotes(p => ({ ...p, [u.id]: e.target.value }))}
                      rows={1}
                      className='w-full rounded-md border border-gray-300 p-3 text-lg resize-y box-border'
                      placeholder='メモを残す'
                    />
                    <button
                      onClick={() => handleSave(u.id)}
                      className='mt-2 rounded-md bg-[#7bc062] text-white px-3 py-2'
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center gap-1'>
                    <span className='text-lg'>{u.note}</span>
                    {me?.id === u.id && (
                      <button
                        onClick={() => setEditingId(u.id)}
                        className='rounded-md bg-blue-600 text-white px-3 py-2'
                      >
                        編集
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
