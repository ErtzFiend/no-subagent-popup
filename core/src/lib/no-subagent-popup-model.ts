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
