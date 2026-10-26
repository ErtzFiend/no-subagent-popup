import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $activeSessionId, $selectedStoredSessionId, $sessions } from '@/store/session'
import { $sessionStates, $sessionTiles, recordSessionEventScope } from '@/store/session-states'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'
import type { SessionInfo } from '@/types/hermes'

import { RunningSubagentRows } from './running-subagent-rows'

const { navigate, snapshot } = vi.hoisted(() => ({ navigate: vi.fn(), snapshot: vi.fn() }))
vi.mock('@/lib/open-subagent-in-current-window', () => ({ openSubagentInCurrentWindow: navigate }))
vi.mock('@/app/chat/composer/status-stack/use-subagent-snapshot', () => ({ useSubagentSnapshot: snapshot }))
const session = { id: 'parent', _lineage_root_id: 'root', title: 'Parent', source: 'local' } as SessionInfo
function child(id: string, status: SubagentProgress['status'] = 'running', parentId: string | null = null): SubagentProgress {
  return { id, sessionId: `child-${id}`, parentId, goal: `Goal ${id}`, status, startedAt: 1, updatedAt: 1,
    taskCount: 1, taskIndex: 0, filesRead: [], filesWritten: [], stream: [] }
}
beforeEach(() => {
  vi.clearAllMocks()
  $sessions.set([session]); $activeSessionId.set('runtime'); $selectedStoredSessionId.set('root')
  $sessionStates.set({}); $sessionTiles.set([]); $subagentsBySession.set({runtime:[child('a')], unrelated:[child('other')]})
})
afterEach(cleanup)
describe('nested running subagents', () => {
  it('renders only this parent and navigates its own child without bubbling parent resume', () => {
    const parentClick = vi.fn()
    render(<div onClick={parentClick}><RunningSubagentRows session={session} /></div>)
    expect(screen.queryByText('Goal other')).toBeNull()
    fireEvent.click(screen.getByRole('button', {name:'Watch subagent: Goal a'}))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('child-a','runtime')
    expect(parentClick).not.toHaveBeenCalled()
    expect(snapshot).toHaveBeenCalledWith('runtime',true)
  })
  it('collapses and expands under parent without losing live child data', () => {
    render(<RunningSubagentRows session={session} />)
    const toggle=screen.getByRole('button',{name:'Running subagents'})
    expect(toggle.getAttribute('aria-expanded')).toBe('true');fireEvent.click(toggle)
    expect(screen.queryByText('Goal a')).toBeNull();expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle);expect(screen.getByText('Goal a')).toBeTruthy()
  })
  it.each(['completed','failed','interrupted'] as const)('automatically removes %s children and empty dropdown', status => {
    render(<RunningSubagentRows session={session} />)
    act(()=>$subagentsBySession.set({runtime:[child('a',status)]}))
    expect(screen.queryByRole('button',{name:'Running subagents'})).toBeNull()
    expect(screen.queryByText('Goal a')).toBeNull()
  })
  it('nests grandchildren and leaves remaining running children visible', () => {
    $subagentsBySession.set({runtime:[child('a'),child('b','running','a'),child('done','completed')]})
    const {container}=render(<RunningSubagentRows session={session} />)
    expect(container.querySelectorAll('[data-slot="sidebar-running-subagent"]')).toHaveLength(2)
    expect(screen.queryByText('Goal done')).toBeNull()
    expect(screen.getByText('Goal b').closest('button')?.parentElement?.style.marginLeft).toBe('10px')
  })
  it('child without a known session remains visible but cannot open a popup', () => {
    $subagentsBySession.set({runtime:[{...child('a'),sessionId:undefined}]})
    render(<RunningSubagentRows session={session} />)
    expect((screen.getByRole('button',{name:'Watch subagent: Goal a'}) as HTMLButtonElement).disabled).toBe(true)
  })
  it('isolates cloned parent IDs by connection and profile and preserves that owner on navigation', () => {
    const scoped={...session,connection_id:'home',profile:'default'}
    recordSessionEventScope({session_id:'owner-home',connectionId:'home',profile:'default'})
    recordSessionEventScope({session_id:'owner-work',connectionId:'work',profile:'default'})
    recordSessionEventScope({session_id:'owner-other-profile',connectionId:'home',profile:'work'})
    $sessionStates.set(Object.fromEntries(['owner-home','owner-work','owner-other-profile'].map(id=>[id,{storedSessionId:'root'} as never])))
    $subagentsBySession.set({'owner-home':[child('owned')],'owner-work':[child('foreign')],'owner-other-profile':[child('different-profile')]})
    render(<RunningSubagentRows session={scoped} />)
    expect(screen.getByText('Goal owned')).toBeTruthy()
    expect(screen.queryByText('Goal foreign')).toBeNull()
    expect(screen.queryByText('Goal different-profile')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Watch subagent: Goal owned'}))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('child-owned','owner-home',{connectionId:'home',profile:'default',targetProfile:'default'})
  })
  it('does not expose unknown-owner runtime children under an explicitly owned parent', () => {
    render(<RunningSubagentRows session={{...session,connection_id:'home',profile:'default'}} />)
    expect(screen.queryByText('Goal a')).toBeNull()
    expect(screen.queryByRole('button',{name:'Running subagents'})).toBeNull()
  })

})
