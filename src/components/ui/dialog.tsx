import * as React from 'react'

export function Dialog({ open, children }: { open?: boolean; children: React.ReactNode }) {
  if (!open) return null
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">{children}</div>
}

export function DialogContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="bg-card text-card-foreground border border-border rounded-md p-4 max-w-md w-full shadow-md" {...props}>{children}</div>
}

export function DialogHeader({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="mb-2" {...props}>{children}</div>
}

export function DialogTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className="font-semibold" {...props}>{children}</h3>
}
