'use client';
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fullWidth?: boolean;
  className?: string;
};

export function Input({
  fullWidth = true,
  style,
  className,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`text-[18px] px-3 py-3 rounded-lg border border-gray-300 ${
        fullWidth ? 'w-full' : ''
      } box-border ${className || ''}`}
      style={{ ...(style || {}) }}
    />
  );
}
