import { useStore } from '@nanostores/react'
import { useCallback } from 'react'

import { duplicateChildRows, liveChildren, parentOwnerMatches, parentRuntimeIds } from '@/lib/no-subagent-popup-model'
import { useNoSubagentPopup } from '@/lib/no-subagent-popup'
import { $activeSessionId, $selectedStoredSessionId, $sessions, lineageAliases } from '@/store/session'
import { $sessionStates, $sessionTiles, runtimeSessionOwner } from '@/store/session-states'
import { $subagentsBySession } from '@/store/subagents'
import type { SessionInfo } from '@/types/hermes'

/** One selector shared by the dotted rows and the ordinary-session deduplicator. */
export function selectParentSubagents(
  session: SessionInfo,
  sessions: SessionInfo[],
  states: ReturnType<typeof $sessionStates.get>,
  tiles: ReturnType<typeof $sessionTiles.get>,
  activeId: string | null,
  selectedId: string | null,
  all: ReturnType<typeof $subagentsBySession.get>
) {
  const aliases = lineageAliases(session._lineage_root_id || session.id, [...sessions, session])
  const expectedOwner = { connectionId: session.connection_id, profile: session.profile }
  const runtimeIds = parentRuntimeIds(aliases, states, tiles, activeId, selectedId, id => {
    const tile = tiles.find(item => item.runtimeId === id)
    return parentOwnerMatches(expectedOwner, runtimeSessionOwner(id) ?? tile?.ownerRoute ?? tile?.ownerProfile)
  })
  const children = liveChildren(runtimeIds.map(id => all[id] ?? []))
  const runtimeId = runtimeIds.find(id => Boolean(states[id])) ??
    tiles.find(tile => tile.runtimeId && runtimeIds.includes(tile.runtimeId))?.runtimeId ??
    (activeId && runtimeIds.includes(activeId) ? activeId : null)
  return { children, runtimeId }
}

/** Filter before flattening, grouping and virtualization so no blank rows remain. */
export function useDottedChildFilter() {
  const enabled = useNoSubagentPopup()
  const all = useStore($subagentsBySession)
  const states = useStore($sessionStates)
  const tiles = useStore($sessionTiles)
  const activeId = useStore($activeSessionId)
  const selectedId = useStore($selectedStoredSessionId)
  const sessions = useStore($sessions)
  return useCallback((items: SessionInfo[]) => {
    if (!enabled) return items
    return duplicateChildRows(items, parent =>
      selectParentSubagents(parent, sessions, states, tiles, activeId, selectedId, all).children)
  }, [enabled, all, states, tiles, activeId, selectedId, sessions])
}
