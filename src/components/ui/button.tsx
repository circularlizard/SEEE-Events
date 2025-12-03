import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    }
    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-sm',
      md: 'h-9 px-4 text-sm rounded-md',
      lg: 'h-10 px-5 text-base rounded-md',
    }
    return (
      <button ref={ref} className={cn('inline-flex items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props} />
    )
  }
)
Button.displayName = 'Button'
