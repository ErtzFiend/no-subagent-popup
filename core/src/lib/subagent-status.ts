export interface SubagentStatusInput {
  status: string
  activityPhase?: 'working' | 'waiting_provider' | 'streaming'
  activitySince?: number
  updatedAt?: number
  waitTimeoutSeconds?: number
  currentTool?: string
}

/** Epoch seconds for provider fields; updatedAt is the store's epoch milliseconds. */
export function formatSubagentStatus(item: SubagentStatusInput, nowSeconds: number): string {
  if (['completed', 'failed', 'interrupted', 'queued'].includes(item.status)) return item.status
  if (item.status === 'dispatched') return 'not currently observed'
  const age = Math.max(0, Math.floor(nowSeconds - (item.updatedAt ?? nowSeconds * 1000) / 1000))
  if (item.activityPhase === 'waiting_provider') {
    const elapsed = Math.max(0, Math.floor(nowSeconds - (item.activitySince ?? (item.updatedAt ?? nowSeconds * 1000) / 1000)))
    const limit = item.waitTimeoutSeconds
    const budget = limit != null && Number.isFinite(limit) && limit > 0 ? ` / ${limit}s${elapsed >= limit ? ' · overdue' : ''}` : ''
    return `waiting on provider · ${elapsed}s${budget}${age >= 45 ? ` · last update ${age}s ago` : ''}`
  }
  const label = item.currentTool ? `working · ${item.currentTool}` : item.activityPhase === 'streaming' ? 'streaming' : 'working'
  return age >= 45 ? `${label} · last update ${age}s ago` : label
}
