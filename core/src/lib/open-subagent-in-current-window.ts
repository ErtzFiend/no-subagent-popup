import { openSession } from '@/app/open-session'
import { setSessionOwnerHint } from '@/store/session'
import { isSessionOwnerRoute, type SessionOwnerRoute } from '@/store/session-request-router'
import { knownOwnerForSession } from '@/store/session-states'
import { rememberInlineSubagentWatch } from '@/store/subagent-watch'

export function openSubagentInCurrentWindow(sessionId: string, parentSessionId?: string | null, parentOwner?: SessionOwnerRoute): void {
  const owner = parentOwner ?? knownOwnerForSession(sessionId) ?? (parentSessionId ? knownOwnerForSession(parentSessionId) : undefined)
  const ownerRoute = owner && isSessionOwnerRoute(owner) ? owner : undefined
  if (ownerRoute) setSessionOwnerHint(sessionId, ownerRoute)
  rememberInlineSubagentWatch(sessionId)
  // Desktop uses a HashRouter. This is an ordinary in-window route change,
  // not a preload call/window.open. in-place retains the current pane/tab.
  openSession(sessionId, to => { window.location.hash = to }, 'in-place', { ownerRoute, workspaceMode: 'sessions' })
}
