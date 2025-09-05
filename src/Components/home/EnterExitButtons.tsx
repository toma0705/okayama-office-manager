'use client';
type Props = { entered: boolean; onEnter: () => void; onExit: () => void };
export function EnterExitButtons({ entered, onEnter, onExit }: Props) {
  return (
    <div className='h-14 mx-auto mb-6 flex justify-center items-center'>
      {!entered ? (
        <button
          onClick={onEnter}
          className='text-white text-[18px] px-4 py-3 rounded-lg w-[120px] bg-[#7bc062]'
        >
          入室
        </button>
      ) : (
        <button
          onClick={onExit}
          className='text-white text-[18px] px-4 py-3 rounded-lg w-[120px] bg-[#e53935]'
        >
          退室
        </button>
      )}
    </div>
  );
}
