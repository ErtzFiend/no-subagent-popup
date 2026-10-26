import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isInlineSubagentWatch } from '@/store/subagent-watch'
import { openSubagentInCurrentWindow } from './open-subagent-in-current-window'

const { open, owner, hint } = vi.hoisted(()=>({open:vi.fn(),owner:vi.fn(),hint:vi.fn()}))
vi.mock('@/app/open-session',()=>({openSession:open}))
vi.mock('@/store/session',()=>({setSessionOwnerHint:hint}))
vi.mock('@/store/session-states',()=>({knownOwnerForSession:owner}))
vi.mock('@/store/session-request-router',()=>({isSessionOwnerRoute:(v:unknown)=>Boolean(v && typeof v==='object' && 'connectionId' in v)}))
beforeEach(()=>{vi.clearAllMocks();window.sessionStorage.clear()})
describe('same-window spectator open',()=>{
 it('uses existing pane, remembers owner, marks watch before invoking navigation',()=>{
  const route={connectionId:'gateway',profile:'default'};owner.mockImplementation((id:string)=>id==='parent'?route:undefined)
  open.mockImplementation((id:string,navigate:(to:string)=>void)=>{expect(isInlineSubagentWatch(id)).toBe(true);navigate('/'+id)})
  openSubagentInCurrentWindow('child-nav','parent')
  expect(hint).toHaveBeenCalledExactlyOnceWith('child-nav',route)
  expect(open).toHaveBeenCalledWith('child-nav',expect.any(Function),'in-place',{ownerRoute:route,workspaceMode:'sessions'})
  expect(window.location.hash).toBe('#/child-nav');expect(isInlineSubagentWatch('parent')).toBe(false)
 })
 it('prefers known child owner rather than overwriting with parent route',()=>{
  const route={connectionId:'child-host',profile:'media'};owner.mockReturnValue(route)
  openSubagentInCurrentWindow('child-owner','parent');expect(hint).toHaveBeenCalledWith('child-owner',route)
 })
 it('never invents an owner when no owner is known',()=>{
  owner.mockReturnValue(undefined);openSubagentInCurrentWindow('child-no-owner')
  expect(hint).not.toHaveBeenCalled();expect(open).toHaveBeenCalledWith('child-no-owner',expect.any(Function),'in-place',{ownerRoute:undefined,workspaceMode:'sessions'})
 })
 it('honors the clicked parent row owner instead of an unrelated cloned child hint',()=>{
  const expected={connectionId:'clicked-parent',profile:'media'}
  owner.mockReturnValue({connectionId:'other-host',profile:'default'})
  openSubagentInCurrentWindow('cloned-child','parent',expected)
  expect(hint).toHaveBeenCalledExactlyOnceWith('cloned-child',expected)
  expect(open).toHaveBeenCalledWith('cloned-child',expect.any(Function),'in-place',{ownerRoute:expected,workspaceMode:'sessions'})
 })

})
