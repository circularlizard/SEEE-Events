import * as React from 'react'

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function Dialog({ 
  children, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: { 
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  // Use controlled or uncontrolled mode
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen
  
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, asChild, ...props }: React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(DialogContext)
  if (!context) throw new Error('DialogTrigger must be used within Dialog')
  
  const handleClick = () => context.onOpenChange(true)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    })
  }
  
  return <button onClick={handleClick} {...props}>{children}</button>
}

export function DialogContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext)
  if (!context) throw new Error('DialogContent must be used within Dialog')
  
  if (!context.open) return null
  
  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => context.onOpenChange(false)}
    >
      <div 
        className="bg-card text-card-foreground border border-border rounded-md p-4 w-full shadow-md"
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="mb-4" {...props}>{children}</div>
}

export function DialogTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className="font-semibold text-lg" {...props}>{children}</h3>
}

export function DialogDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="text-sm text-muted-foreground" {...props}>{children}</p>
}
