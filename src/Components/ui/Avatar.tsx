'use client';
import Image from 'next/image';

type Props = {
  src?: string | null;
  alt: string;
  size?: number;
  rounded?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Avatar({
  src,
  alt,
  size = 64,
  rounded = true,
  style,
  className,
}: Props) {
  const valid = src && src.startsWith('http') ? src : '/file.svg';
  return (
    <Image
      src={valid}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        borderRadius: rounded ? '50%' : 8,
        objectFit: 'cover',
        background: '#eee',
        aspectRatio: '1 / 1',
        display: 'block',
        ...(style || {}),
      }}
      onError={(e: any) => {
        const target = e.target as HTMLImageElement;
        if (target && target.src !== '/file.svg') target.src = '/file.svg';
      }}
    />
  );
}
