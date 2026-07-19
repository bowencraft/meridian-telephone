import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface CollapsibleAdminSectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function CollapsibleAdminSection({ title, children, className = '' }: CollapsibleAdminSectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className={`admin-collapsible ${open ? 'is-open' : ''} ${className}`}>
      <button
        className="admin-collapsible-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span><ChevronDown size={14} />
      </button>
      {open && <div className="admin-collapsible-content">{children}</div>}
    </section>
  )
}
