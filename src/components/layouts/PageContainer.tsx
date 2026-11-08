'use client';
import React from 'react';

/** 画面全体の外枠（背景・余白・中央寄せ）。各ページの一番外側で使う */
export function PageContainer({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`px-6 max-w-[600px] mx-auto min-h-screen flex flex-col justify-center bg-[#f7f7f7] ${
        className || ''
      }`}
      style={{
        minHeight: '100dvh',
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}
