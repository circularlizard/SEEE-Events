import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-2 focus-visible:ring-ring',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
    }
    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
      md: 'h-9 px-4 text-sm rounded-[var(--radius-md)]',
      lg: 'h-10 px-5 text-base rounded-[var(--radius-lg)]',
    }
    return (
      <button ref={ref} className={cn('inline-flex items-center justify-center', variants[variant], sizes[size], className)} {...props} />
    )
  }
)
Button.displayName = 'Button'
