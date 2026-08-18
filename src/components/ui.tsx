import type { ReactNode } from 'react'

export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-6 md:px-10 ${className}`}>{children}</div>
}

export function Eyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-hair bg-surface/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-soft">
      {icon}
      {children}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  icon,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div className={`flex flex-col gap-4 ${align === 'center' ? 'items-center text-center' : 'items-start text-left'}`}>
      {eyebrow ? <Eyebrow icon={icon}>{eyebrow}</Eyebrow> : null}
      <h2 className={`font-display text-3xl font-medium leading-[1.1] tracking-tight text-fg md:text-[42px] ${align === 'center' ? 'max-w-2xl' : 'max-w-xl'}`}>
        {title}
      </h2>
      {description ? (
        <p className={`text-[15px] leading-relaxed text-fg-dim md:text-base ${align === 'center' ? 'max-w-xl' : 'max-w-lg'}`}>{description}</p>
      ) : null}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap'
  const styles = {
    primary:
      'bg-cyan text-ink shadow-[0_0_0_1px_rgba(46,230,255,0.4),0_8px_30px_-6px_rgba(46,230,255,0.55)] hover:shadow-[0_0_0_1px_rgba(46,230,255,0.6),0_8px_40px_-4px_rgba(46,230,255,0.75)] hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'border border-hair-strong bg-surface text-fg hover:border-cyan/40 hover:bg-surface-2 hover:-translate-y-0.5',
    ghost: 'text-fg-dim hover:text-fg',
  }
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'cyan' }: { children: ReactNode; tone?: 'cyan' | 'amber' | 'violet' | 'green' | 'red' | 'neutral' }) {
  const tones: Record<string, string> = {
    cyan: 'text-cyan-soft border-cyan/30 bg-cyan/10',
    amber: 'text-amber border-amber/30 bg-amber/10',
    violet: 'text-violet border-violet/30 bg-violet/10',
    green: 'text-green border-green/30 bg-green/10',
    red: 'text-red border-red/30 bg-red/10',
    neutral: 'text-fg-dim border-hair-strong bg-surface-2',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function CardShell({
  className = '',
  children,
  onClick,
}: {
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-hair bg-gradient-to-b from-surface to-surface/40 ${className}`}
    >
      {children}
    </div>
  )
}
