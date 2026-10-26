/** Main-window subagent tabs must use the gateway's lazy spectator resume,
 * just like the original watch popup. No child agent is constructed or submitted. */
const watched = new Set<string>()
const STORAGE_KEY = 'hermes.no-subagent-popup.watch'
export function rememberInlineSubagentWatch(sessionId: string): void {
  watched.add(sessionId)
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]')
    const ids = new Set<string>(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [])
    ids.add(sessionId)
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-256)))
  } catch { /* Sandboxed storage must not break navigation. */ }
}
export function isInlineSubagentWatch(sessionId?: string | null): boolean {
  if (!sessionId && typeof window !== 'undefined') {
    try { sessionId = decodeURIComponent(window.location.hash.slice(1).split('?')[0].replace(/^\//, '')) }
    catch { return false }
  }
  if (!sessionId) return false
  if (watched.has(sessionId)) return true
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) && saved.includes(sessionId)
  } catch { return false }
}
