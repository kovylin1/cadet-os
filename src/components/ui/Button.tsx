import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.98] ' +
  'disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:shrink-0'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover disabled:hover:bg-accent',
  secondary:
    'bg-surface-raised text-ink border border-hairline hover:border-control hover:bg-hairline disabled:hover:bg-surface-raised disabled:hover:border-hairline',
  ghost: 'text-muted hover:text-ink hover:bg-surface-raised disabled:hover:bg-transparent disabled:hover:text-muted',
  danger:
    'text-danger border border-danger/70 hover:bg-danger/12 hover:border-danger disabled:hover:bg-transparent',
}

// Touch targets are 44px on small screens, tightening to desktop density from `sm` up.
const sizes: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm sm:h-8',
  md: 'h-11 px-4 text-sm sm:h-10',
  icon: 'size-11 sm:size-10',
  'icon-sm': 'size-11 sm:size-8',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
})
