'use client';
import Link from 'next/link';
import React from 'react';

type Props = {
  href: string;
  children: React.ReactNode;
  underline?: boolean;
  center?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export function LinkButton({
  href,
  children,
  underline = true,
  center = false,
  style,
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={`text-[#7bc062] text-[15px] font-semibold ${
        underline ? 'underline' : 'no-underline'
      } block ${center ? 'text-center' : ''} ${className || ''}`}
      style={{ ...(style || {}) }}
    >
      {children}
    </Link>
  );
}
