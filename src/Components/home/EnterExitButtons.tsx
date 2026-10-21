'use client';
type Props = {
  entered: boolean;
  onEnter: () => void;
  onExit: () => void;
  disabled?: boolean;
};
export function EnterExitButtons({ entered, onEnter, onExit, disabled }: Props) {
  return (
    <div className='mx-auto mb-6 flex flex-col items-center gap-2'>
      <div className='h-14 flex justify-center items-center'>
        {!entered ? (
          <button
            onClick={onEnter}
            disabled={disabled}
            className='text-white text-[18px] px-4 py-3 rounded-lg w-[120px] bg-[#7bc062] disabled:opacity-60 disabled:cursor-not-allowed'
          >
            入室
          </button>
        ) : (
          <button
            onClick={onExit}
            disabled={disabled}
            className='text-white text-[18px] px-4 py-3 rounded-lg w-[120px] bg-[#e53935] disabled:opacity-60 disabled:cursor-not-allowed'
          >
            退室
          </button>
        )}
      </div>
      <p className='max-w-xs text-center text-xs leading-5 text-gray-500'>
        アプリでビーコンの自動記録をしている人は、ここで変更しても、アプリを開いたときやオフィスへの出入りで上書きされます。
      </p>
    </div>
  );
}
