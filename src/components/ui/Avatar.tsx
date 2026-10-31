'use client';

const DEFAULT_ICON = '/icons/file.svg';

type Props = {
  /** 画像の URL（API が返す URL、または選択中のファイルのプレビュー） */
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
};

/** 丸いプロフィール画像。読み込めなければ既定のアイコンにする */
export function Avatar({ src, alt, size = 64, className }: Props) {
  return (
    // 外部（R2）の小さなアイコンなので、next/image の最適化は使わない
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || DEFAULT_ICON}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover', background: '#eee', aspectRatio: '1 / 1' }}
      onError={event => {
        if (!event.currentTarget.src.endsWith(DEFAULT_ICON)) event.currentTarget.src = DEFAULT_ICON;
      }}
    />
  );
}
