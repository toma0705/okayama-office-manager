'use client';
import Image from 'next/image';
import { Avatar } from '@/Components/ui/Avatar';
import type { User } from '@/types/declaration';

type Props = {
  user: User | null;
  onClose?: () => void;
  onLogout: () => void;
  onDelete: () => Promise<void> | void;
};

export function UserSidebar({ user, onClose, onLogout, onDelete }: Props) {
  if (!user) return null;
  return (
    <div className='fixed top-0 right-0 h-screen bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.12)] z-[100] flex flex-col items-center p-6 transition-transform duration-300 ease-out w-[50vw] max-w-[360px] min-w-[220px]'>
      <button
        onClick={onClose}
        className='absolute top-4 right-6 text-5xl bg-transparent border-0 cursor-pointer text-gray-500 leading-none'
        aria-label='サイドバーを閉じる'
      >
        <Image
          src='/icons/close.png'
          alt='閉じる'
          width={24}
          height={24}
          className='block w-6 h-6'
        />
      </button>
      <div className='flex items-center mt-8 mb-8'>
        <Avatar src={user.iconFileName} alt={user.name} size={64} />
        <div className='ml-5 flex flex-col gap-1'>
          <span className='text-[22px] font-semibold'>{user.name}</span>
          <span className='text-sm text-gray-500'>{user.office.name}</span>
        </div>
      </div>
      <button
        onClick={onLogout}
        className='text-[16px] px-6 py-3 rounded-lg bg-white text-[#7bc062] border-2 border-[#7bc062] cursor-pointer font-bold mb-4'
      >
        ログアウト
      </button>
      <button
        onClick={() => void onDelete()}
        className='text-[16px] px-6 py-3 rounded-lg bg-[#e53935] text-white border-0 cursor-pointer font-semibold mb-6'
      >
        アカウント削除
      </button>
    </div>
  );
}
