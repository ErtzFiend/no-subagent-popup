import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { useSubagentSnapshot } from '@/app/chat/composer/status-stack/use-subagent-snapshot'
import { selectParentSubagents } from './parent-subagents'
import { openSubagentInCurrentWindow } from '@/lib/open-subagent-in-current-window'
import { $activeSessionId, $selectedStoredSessionId, $sessions, sessionOwnerRouteFromRow } from '@/store/session'
import { $sessionStates, $sessionTiles } from '@/store/session-states'
import { $subagentsBySession, buildSubagentTree, type SubagentNode } from '@/store/subagents'
import type { SessionInfo } from '@/types/hermes'
import { formatSubagentStatus } from '@/lib/subagent-status'
import { useSubagentStatusClock } from '@/lib/use-subagent-status-clock'

export function RunningSubagentRows({ session }: { session: SessionInfo }) {
  const all = useStore($subagentsBySession)
  const states = useStore($sessionStates)
  const tiles = useStore($sessionTiles)
  const activeId = useStore($activeSessionId)
  const selectedId = useStore($selectedStoredSessionId)
  const sessions = useStore($sessions)
  const [expanded, setExpanded] = useState(true)
  const ownerRoute = sessionOwnerRouteFromRow(session)
  const { children, runtimeId } = selectParentSubagents(session, sessions, states, tiles, activeId, selectedId, all)
  useSubagentSnapshot(runtimeId, children.length > 0)
  const nowSeconds = useSubagentStatusClock(children.length > 0 && expanded)
  if (!children.length) return null

  const renderChildren = (nodes: SubagentNode[], depth = 0): React.ReactNode => nodes.map(({ children: nested, ...item }) => (
    <div key={item.id} style={{ marginLeft: depth ? 10 : 0 }}>
      <button
        type="button"
        data-slot="sidebar-running-subagent"
        data-subagent-id={item.id}
        className="flex w-full min-w-0 items-center gap-1 rounded px-1 py-1 text-left text-xs text-(--ui-text-secondary) hover:bg-(--ui-interactive-hover) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring"
        disabled={!item.sessionId}
        title={item.goal}
        aria-label={`Watch subagent: ${item.goal}`}
        onClick={event => {
          event.stopPropagation()
          if (item.sessionId) {
            if (ownerRoute) openSubagentInCurrentWindow(item.sessionId, runtimeId, ownerRoute)
            else openSubagentInCurrentWindow(item.sessionId, runtimeId)
          }
        }}
      >
        <span aria-hidden="true" className="shrink-0 text-(--ui-text-tertiary)">◌</span>
        <span className="min-w-0 flex-1 truncate">{item.goal || 'Subagent'}</span>
        <span title={formatSubagentStatus(item, nowSeconds)} className="max-w-[55%] shrink-0 truncate text-[0.625rem] text-(--ui-text-tertiary)">{formatSubagentStatus(item, nowSeconds)}</span>
      </button>
      {renderChildren(nested, depth + 1)}
    </div>
  ))

  return (
    <div data-slot="sidebar-live-subagents" className="mb-1 ml-5 min-w-0 border-l border-(--ui-stroke-tertiary) pl-2"
      onPointerDown={event => event.stopPropagation()} onContextMenu={event => event.stopPropagation()}>
      <button type="button" className="w-full py-1 text-left text-[0.625rem] text-(--ui-text-tertiary)"
        aria-expanded={expanded} aria-label="Running subagents"
        onClick={event => { event.stopPropagation(); setExpanded(value => !value) }}>
        {expanded ? '▾' : '▸'} {children.length} running {children.length === 1 ? 'subagent' : 'subagents'}
      </button>
      {expanded && renderChildren(buildSubagentTree(children))}
    </div>
  )
}
