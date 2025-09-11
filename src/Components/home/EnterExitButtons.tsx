'use client';
type Props = {
  entered: boolean;
  onEnter: () => void;
  onExit: () => void;
  disabled?: boolean;
};
export function EnterExitButtons({ entered, onEnter, onExit, disabled }: Props) {
  return (
    <div className='h-14 mx-auto mb-6 flex justify-center items-center'>
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
  );
}
