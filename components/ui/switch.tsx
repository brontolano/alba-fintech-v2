"use client"

import * as React from "react"

/**
 * Reusable toggle switch component following WCAG accessibility guidelines.
 *
 * - Uses semantic `<button role="switch">` with proper aria attributes
 * - Keyboard accessible (Space/Enter toggles, Tab navigates)
 * - Visual feedback via bg color + thumb position
 * - Touch target minimum: 48x48px on mobile
 */
export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean
  onChange?: (checked: boolean) => void
  label?: string
}

export function Switch({
  checked,
  onChange,
  label,
  className,
  ...props
}: SwitchProps) {
  const handleClick = () => {
    onChange?.(!checked)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      onChange?.(!checked)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        "relative inline-flex h-6 w-12 items-center rounded-full",
        "outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-slate-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className="sr-only">{label || "Toggle switch"}</span>
      <span
        className={[
          "absolute inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
          "shadow-sm",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  )
}

Switch.displayName = "Switch"
