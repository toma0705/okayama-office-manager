'use client';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  primary: 'bg-[#7bc062] text-white border border-transparent',
  secondary: 'bg-white text-[#7bc062] border border-[#7bc062]',
  danger: 'bg-[#e53935] text-white border border-transparent',
  ghost: 'bg-transparent text-[#555] border border-transparent',
};

/**
 * ボタン。variant で色を選ぶ（primary: 緑・secondary: 白地に緑・danger: 赤・ghost: 枠なし）。
 * それ以外の属性（onClick・disabled・type など）は、そのまま HTML の <button> に渡す。
 */
export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const base = 'text-[16px] px-3 py-3 rounded-lg';
  const width = fullWidth ? 'w-full' : '';
  const cursor = props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
  return (
    <button
      {...props}
      className={`${base} ${width} ${variantClass[variant]} ${cursor} ${className}`.trim()}
      style={{ ...(style || {}) }}
    />
  );
}
