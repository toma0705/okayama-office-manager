'use client';
import Image from 'next/image';
import { convertIconUrl } from '@/lib/utils/icon-url';

type Props = {
  src?: string | null;
  alt: string;
  size?: number;
  rounded?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Avatar({ src, alt, size = 64, rounded = true, style, className }: Props) {
  let valid = src ? convertIconUrl(src) : '/file.svg';

  try {
    const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (r2 && typeof valid === 'string') {
      const marker = '/user-icons/';
      const idx = valid.indexOf(marker);
      if (idx !== -1) {
        const suffix = valid.substring(idx + 1);
        valid = `${r2}/${suffix}`;
      } else if (valid.includes('.supabase.co')) {
        try {
          const u = new URL(valid);
          const p = u.pathname.replace(/^\//, '');
          valid = `${r2}/${p}`;
        } catch {
          // ignore malformed URLs
        }
      }
    }
  } catch {
    // ignore any runtime issues
  }
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
