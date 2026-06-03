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
  const isDirectPreview = !!(
    src &&
    typeof src === 'string' &&
    (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/'))
  );
  const forcePlainImg = allowExternal && !!(src && typeof src === 'string');

  let valid = '/icons/file.svg';
  if (!isDirectPreview && src && typeof src === 'string' && r2Public) {
    const expectedPrefix = `${r2Public.replace(/\/+$/, '')}/user-icons/`;
    if (src.startsWith(expectedPrefix)) valid = src;
  }

  const commonStyle: React.CSSProperties = {
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#eee',
    aspectRatio: '1 / 1',
    display: 'block',
    ...(style || {}),
  };

  if ((isDirectPreview || forcePlainImg) && src) {
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
