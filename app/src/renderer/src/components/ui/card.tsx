import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <section className={cn('bg-card border border-border px-4 py-3.5', className)} {...props} />
}

export function CardTitle({
  children,
  hint,
  className
}: {
  children: React.ReactNode
  hint?: string
  className?: string
}): React.JSX.Element {
  return (
    <h2 className={cn('mb-2.5 flex items-baseline font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted', className)}>
      {children}
      {hint && <span className="ml-2 text-[11px] normal-case tracking-normal text-dim">{hint}</span>}
    </h2>
  )
}

export function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-2.5 flex flex-col gap-1.5 last:mb-0">
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
        <span>{label}</span>
        {value !== undefined && <span className="text-foreground">{value}</span>}
      </div>
      {children}
    </div>
  )
}
