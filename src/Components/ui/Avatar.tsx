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
  const resolvedSrc =
    src &&
    typeof src === 'string' &&
    !src.startsWith('http') &&
    !src.startsWith('blob:') &&
    !src.startsWith('data:')
      ? (r2Public ? `${r2Public}/${src.replace(/^\/+/, '')}` : `/icons/${src.replace(/^\/+/, '')}`)
      : src;
  const isDirectPreview = !!(
    resolvedSrc &&
    typeof resolvedSrc === 'string' &&
    (resolvedSrc.startsWith('blob:') ||
      resolvedSrc.startsWith('data:') ||
      resolvedSrc.startsWith('http'))
  );
  const forcePlainImg = allowExternal && !!(resolvedSrc && typeof resolvedSrc === 'string');

  let valid = '/icons/file.svg';
  if (!isDirectPreview && resolvedSrc) {
    valid = resolvedSrc;
  }

  const commonStyle: React.CSSProperties = {
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#eee',
    aspectRatio: '1 / 1',
    display: 'block',
    ...(style || {}),
  };

  if ((isDirectPreview || forcePlainImg) && resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
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
