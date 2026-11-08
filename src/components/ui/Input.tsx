'use client';
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fullWidth?: boolean;
  className?: string;
};

/** 入力欄。属性（value・onChange・placeholder など）は、そのまま HTML の <input> に渡す */
export function Input({ fullWidth = true, style, className, ...props }: InputProps) {
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
