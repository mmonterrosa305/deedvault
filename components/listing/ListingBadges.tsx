export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Active: { background: 'rgba(58,170,110,.1)', color: '#3aaa6e', border: '1px solid rgba(58,170,110,.25)' },
    Upcoming: { background: 'rgba(201,168,76,.08)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' },
    Closed: { background: 'rgba(107,101,96,.1)', color: 'var(--muted)', border: '1px solid var(--border)' },
  }
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={styles[status] ?? styles.Closed}>
      {status === 'Active' && <span className="gold-pulse inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />}
      {status.toUpperCase()}
    </span>
  )
}

export function AuctionBadge({ type }: { type: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Live: { background: 'rgba(90,159,232,.1)', color: '#5a9fe8', border: '1px solid rgba(90,159,232,.2)' },
    Online: { background: 'rgba(167,139,250,.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.2)' },
    OCP: { background: 'rgba(201,168,76,.08)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' },
  }
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={styles[type] ?? {}}>
      {type.toUpperCase()}
    </span>
  )
}
