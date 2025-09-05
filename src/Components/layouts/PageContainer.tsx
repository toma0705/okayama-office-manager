'use client';
import React from 'react';

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
      style={{ ...(style || {}) }}
    >
      {children}
    </div>
  );
}
