"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "pattern">;

export function StrictIntegerInput({ onChange, onKeyDown, ...props }: Props) {
  return <input
    {...props}
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    onKeyDown={(event) => {
      if (!event.ctrlKey && !event.metaKey && event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault();
      onKeyDown?.(event);
    }}
    onChange={(event) => {
      const digitsOnly = event.currentTarget.value.replace(/\D/g, "");
      if (event.currentTarget.value !== digitsOnly) event.currentTarget.value = digitsOnly;
      onChange?.(event);
    }}
  />;
}
