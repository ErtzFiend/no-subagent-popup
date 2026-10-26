export interface RunningChild {
  id: string
  sessionId?: string | null
  goal: string
  status: string
  updatedAt: number
}

/** Only actual live work belongs in the sidebar, never terminal/detached summaries. */
export function liveChildren<T extends RunningChild>(groups: readonly (readonly T[])[]): T[] {
  const latest = new Map<string, T>()
  for (const group of groups) {
    for (const child of group) {
      const key = child.sessionId || child.id
      const previous = latest.get(key)
      const terminal = child.status !== 'running' && child.status !== 'queued'
      if (!previous || child.updatedAt > previous.updatedAt ||
        (child.updatedAt === previous.updatedAt && terminal)) latest.set(key, child)
    }
  }
  return [...latest.values()].filter(child => child.status === 'running' || child.status === 'queued')
}

/** Owner identity must be checked as well as stored ids: profiles/connections
 * can contain cloned sessions with identical lineage ids. Unknown exact owners
 * fail closed, while legacy untagged default-profile sessions remain supported. */
export interface ParentOwner {
  connectionId?: string | null
  profile?: string | null
}

export function parentOwnerMatches(expected: ParentOwner, actual?: ParentOwner | string | null): boolean {
  const profile = (value?: string | null) => value?.trim() || 'default'
  const candidate = typeof actual === 'string' ? { profile: actual } : actual
  const expectedConnection = expected.connectionId?.trim() || ''
  const actualConnection = candidate?.connectionId?.trim() || ''
  return expectedConnection === actualConnection && profile(expected.profile) === profile(candidate?.profile)
}

/** Map durable parent ids to live transport ids without assuming they are equal. */
export function parentRuntimeIds(
  aliases: readonly string[],
  states: Record<string, { storedSessionId?: string | null }>,
  tiles: readonly { storedSessionId: string; runtimeId?: string | null }[],
  activeId: string | null,
  selectedId: string | null,
  acceptRuntime: (runtimeId: string) => boolean = () => true
): string[] {
  const ids = new Set(aliases)
  for (const [runtimeId, state] of Object.entries(states)) {
    if (state.storedSessionId && ids.has(state.storedSessionId)) ids.add(runtimeId)
  }
  for (const tile of tiles) {
    if (aliases.includes(tile.storedSessionId) && tile.runtimeId) ids.add(tile.runtimeId)
  }
  if (selectedId && aliases.includes(selectedId) && activeId) ids.add(activeId)
  return [...ids].filter(acceptRuntime)
}

interface SidebarChildSession {
  id: string
  _lineage_root_id?: string | null
  _lineage_ids?: string[] | null
  connection_id?: string | null
  profile?: string | null
}

/** Keep the dotted representation only when this same list contains its parent.
 * No title/goal/index heuristics: exact transcript identity and owner must agree.
 * Orphaned, searched-for, or cross-owner sessions remain accessible normally.
 */
export function duplicateChildRows<T extends SidebarChildSession>(
  sessions: T[],
  childrenFor: (parent: T) => readonly RunningChild[]
): T[] {
  const represented = sessions.map(parent => ({ parent, children: childrenFor(parent) }))
  return sessions.filter(candidate => !represented.some(({ parent, children }) => {
    if (parent === candidate || !parentOwnerMatches(
      { connectionId: candidate.connection_id, profile: candidate.profile },
      { connectionId: parent.connection_id, profile: parent.profile }
    )) return false
    const aliases = new Set([candidate.id, candidate._lineage_root_id, ...(candidate._lineage_ids ?? [])].filter(Boolean))
    return children.some(child => (child.status === 'running' || child.status === 'queued') &&
      Boolean(child.sessionId && aliases.has(child.sessionId)))
  }))
}
