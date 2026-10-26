import { parentOwnerMatches } from '@/lib/no-subagent-popup-model'
import { $sessions } from '@/store/session'
import { $sessionStates, $sessionTiles, runtimeSessionOwner } from '@/store/session-states'
import { $subagentsBySession } from '@/store/subagents'

import { delegateHistoryScope, rememberDelegateLinks } from './no-subagent-popup-history'

type Owner = Parameters<typeof delegateHistoryScope>[0]
let references = 0
let stop: (() => void) | undefined

export function childHistoryScope(owner: Owner, storedId: string | null): string | null {
  const row = $sessions.get().find(item => item.id === storedId && parentOwnerMatches(
    { connectionId: item.connection_id, profile: item.profile }, owner))
  return delegateHistoryScope(owner, row?._lineage_root_id || storedId, 'children')
}

/** Observe the underlying store, not virtualized cards: off-screen children must retain their links too. */
export function startChildLinkHistory(): () => void {
  references++
  if (!stop) {
    const fingerprints = new Map<string, string>()
    const capture = () => {
      try {
        for (const [runtimeId, children] of Object.entries($subagentsBySession.get())) {
          const parentId = $sessionStates.get()[runtimeId]?.storedSessionId ||
            $sessionTiles.get().find(tile => tile.runtimeId === runtimeId)?.storedSessionId || null
          const scope = childHistoryScope(runtimeSessionOwner(runtimeId), parentId)
          if (!scope) continue
          const fingerprint = JSON.stringify([scope, children.map(child => [child.id, child.sessionId, child.status])])
          if (fingerprints.get(runtimeId) === fingerprint) continue
          const rows = children.map(child => ({
            id: child.id, subagentId: child.id, sessionId: child.sessionId, status: child.status, activity: [], goal: ''
          }))
          rememberDelegateLinks(rows, rows, scope, window.localStorage)
          fingerprints.set(runtimeId, fingerprint)
        }
      } catch { /* Renderer/storage initialization or denial must not affect live agents. */ }
    }
    const disposers = [$subagentsBySession.listen(capture), $sessionStates.listen(capture), $sessionTiles.listen(capture), $sessions.listen(capture)]
    capture()
    stop = () => { disposers.forEach(dispose => dispose()); stop = undefined }
  }
  return () => { references--; if (!references) stop?.() }
}
