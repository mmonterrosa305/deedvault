/** Human-readable age for cache / freshness labels. */
export function formatDataAge(timestamp: number | null, now = Date.now()): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return ''

  const mins = Math.floor((now - timestamp) / 60_000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`

  const hours = Math.floor(mins / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

/** Oldest timestamp in a bundle (stalest cached source). */
export function oldestCachedAt(timestamps: Array<number | undefined | null>): number | null {
  const valid = timestamps.filter((t): t is number => typeof t === 'number' && t > 0)
  if (valid.length === 0) return null
  return Math.min(...valid)
}
