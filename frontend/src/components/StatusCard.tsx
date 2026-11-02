import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  label: string
  value: string
  description: string
  tone?: 'good' | 'warning' | 'neutral'
}

export function StatusCard({ icon, label, value, description, tone = 'neutral' }: Props) {
  return <article className="status-card">
    <div className="card-heading"><span>{label}</span><span className="card-icon">{icon}</span></div>
    <div className={`status-value ${tone}`}><span className="status-dot" />{value}</div>
    <p>{description}</p>
  </article>
}
