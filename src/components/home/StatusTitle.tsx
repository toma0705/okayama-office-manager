'use client';
/** ホームの大きな表示。入室中なら「入室中」、そうでなければ「退出中」と出す */
export function StatusTitle({ entered }: { entered: boolean }) {
  return (
    <div
      className={`w-full text-center mb-8 mt-2 text-[32px] font-bold tracking-wider transition-all ${
        entered ? 'text-[#7bc062]' : 'text-[#e53935]'
      }`}
    >
      {entered ? '入室中' : '退出中'}
    </div>
  );
}
