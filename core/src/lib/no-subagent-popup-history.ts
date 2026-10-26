import type { DelegateRow } from '@/components/assistant-ui/tool/delegate-model'

export const DELEGATE_HISTORY_KEY = 'hermes.no-subagent-popup.completed-links.v1'
const MAX_CALLS = 256
const MAX_ROWS = 64
interface Link { subagentId: string; sessionId: string; status: DelegateRow['status'] }
interface SavedCall { scope: string; links: Link[] }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
const statuses = new Set(['queued', 'running', 'completed', 'failed', 'interrupted', 'dispatched'])

/** Missing ownership is NOT the default connection. Never join by goal or index alone. */
export function delegateHistoryScope(
  owner: string | { connectionId: string; profile?: string } | null | undefined,
  parentId: string | null,
  toolCallId: string | undefined
): string | null {
  if (!owner || !parentId || !toolCallId) return null
  const route = typeof owner === 'string' ? ['legacy-profile', owner] : ['connection', owner.connectionId, owner.profile || 'default']
  if (route.some(value => !value)) return null
  return JSON.stringify([...route, parentId, toolCallId])
}

function readCalls(storage: StorageLike): SavedCall[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(DELEGATE_HISTORY_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.slice(-MAX_CALLS).flatMap((call: unknown) => {
      if (!call || typeof call !== 'object' || !('scope' in call) || typeof call.scope !== 'string' || !('links' in call) || !Array.isArray(call.links)) return []
      const links = call.links.slice(0, MAX_ROWS).filter((link: unknown): link is Link => {
        if (!link || typeof link !== 'object') return false
        const value = link as Partial<Link>
        return typeof value.subagentId === 'string' && !!value.subagentId &&
          typeof value.sessionId === 'string' && !!value.sessionId && typeof value.status === 'string' && statuses.has(value.status)
      })
      return [{ scope: call.scope, links }]
    })
  } catch { return [] }
}

export function restoreDelegateLinks(rows: readonly DelegateRow[], scope: string | null, storage: StorageLike): DelegateRow[] {
  if (!scope) return [...rows]
  const saved = readCalls(storage).find(call => call.scope === scope)
  return rows.map(row => {
    if (row.sessionId || !row.subagentId) return row
    const link = saved?.links.find(item => item.subagentId === row.subagentId)
    if (!link) return row
    // Cached liveness never starts a spinner after reload. Only a terminal status is durable evidence.
    const status = ['completed', 'failed', 'interrupted'].includes(link.status) ? link.status : row.status
    return { ...row, sessionId: link.sessionId, status }
  })
}

/** Only links joined by the persisted dispatch child ID may enter the archive. */
export function rememberDelegateLinks(
  dispatched: readonly DelegateRow[], resolved: readonly DelegateRow[], scope: string | null, storage: StorageLike
): void {
  if (!scope) return
  const links = dispatched.flatMap(row => {
    if (!row.subagentId) return []
    const current = resolved.find(item => item.subagentId === row.subagentId)
    return current?.sessionId ? [{ subagentId: row.subagentId, sessionId: current.sessionId, status: current.status }] : []
  }).slice(0, MAX_ROWS)
  if (!links.length) return
  try {
    const calls = readCalls(storage)
    const previous = calls.find(call => call.scope === scope)?.links || []
    const combined = [...previous.filter(old => !links.some(link => link.subagentId === old.subagentId)), ...links].slice(-MAX_ROWS)
    const next = [...calls.filter(call => call.scope !== scope), { scope, links: combined }].slice(-MAX_CALLS)
    const encoded = JSON.stringify(next)
    if (storage.getItem(DELEGATE_HISTORY_KEY) !== encoded) storage.setItem(DELEGATE_HISTORY_KEY, encoded)
  } catch { /* Storage denial/quota must never break transcript rendering. */ }
}
