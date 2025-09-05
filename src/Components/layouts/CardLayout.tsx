'use client';
import React from 'react';

export function CardLayout({
  children,
  maxWidth = 400,
  className,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto my-16 bg-white rounded-2xl shadow-lg px-8 py-8 ${
        className || ''
      }`}
      style={{ maxWidth }}
    >
      {children}
    </div>
  );
}
