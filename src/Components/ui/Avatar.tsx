'use client';
import Image from 'next/image';

type Props = {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  allowExternal?: boolean;
};

export function Avatar({ src, alt, size = 64, style, className, allowExternal = false }: Props) {
  const r2Public = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  // プレビュー判定: blob:, data:, もしくはルート相対パス
  const isDirectPreview = !!(
    src &&
    typeof src === 'string' &&
    (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/'))
  );
  const forcePlainImg = allowExternal && !!(src && typeof src === 'string');

  // next/image に渡す最終 URL を決定するマッピングルール
  // - 既に R2 ベースならそのまま（それ以外はフォールバック）
  let valid = '/icons/file.svg';
  if (!isDirectPreview && src && r2Public && src.startsWith(r2Public)) valid = src;

  const commonStyle: React.CSSProperties = {
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#eee',
    aspectRatio: '1 / 1',
    display: 'block',
    ...(style || {}),
  };

  if ((isDirectPreview || forcePlainImg) && src) {
    // プレビューや外部 URL を許可した場合は直接 <img> を使う
    if (typeof window !== 'undefined') {
      console.log('[Avatar] using <img> preview src ->', src);
    }
    return (
      // Preview時は next/image で処理できないURLも来るので、直接 <img> を使う
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={commonStyle}
        loading='eager'
        decoding='sync'
        fetchPriority='high'
        onError={(e: any) => {
          const target = e.target as HTMLImageElement;
          if (target && target.src !== '/icons/file.svg') target.src = '/icons/file.svg';
        }}
      />
    );
  }

  return (
    <Image
      src={valid}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={commonStyle}
      onError={(e: any) => {
        const target = e.target as HTMLImageElement;
        if (target && target.src !== '/icons/file.svg') target.src = '/icons/file.svg';
      }}
    />
  );
}
