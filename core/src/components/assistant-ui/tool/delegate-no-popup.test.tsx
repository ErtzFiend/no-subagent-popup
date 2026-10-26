import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registry } from '@/contrib/registry'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'

import { DelegateTool } from './delegate'
import { runtimeSessionOwner } from '@/store/session-states'
import { startChildLinkHistory } from '@/lib/no-subagent-popup-history-runtime'

const { inline, popup } = vi.hoisted(() => ({inline: vi.fn(), popup: vi.fn()}))
vi.mock('@/lib/open-subagent-in-current-window',()=>({openSubagentInCurrentWindow:inline}))
vi.mock('@/store/windows',()=>({openSessionInNewWindow:popup}))
vi.mock('@/app/chat/session-view',async()=>{
  const {atom}=await import('nanostores')
  const view={$storedId:atom('parent'),$runtimeId:atom('runtime')}
  return {useSessionView:()=>view}
})
vi.mock('@/store/session-states',async()=>{
  const {atom}=await import('nanostores')
  return {$sessionStates:atom({runtime:{storedSessionId:'parent'}}),$sessionTiles:atom([]),runtimeSessionOwner:vi.fn(()=>({connectionId:'server-a',profile:'default'}))}
})
vi.mock('@/store/session',async()=>{
  const {atom}=await import('nanostores')
  return {$sessions:atom([])}
})
let dispose: (()=>void) | undefined
beforeEach(()=>{
  vi.clearAllMocks()
  window.localStorage.clear()
  vi.mocked(runtimeSessionOwner).mockReturnValue({connectionId:'server-a',profile:'default'})
  $subagentsBySession.set({runtime:[{id:'sa',parentId:null,goal:'Investigate source',sessionId:'child-session',status:'completed',
    startedAt:1,updatedAt:2,taskCount:1,taskIndex:0,filesRead:[],filesWritten:[],stream:[]} as SubagentProgress]})
})
afterEach(()=>{cleanup();dispose?.();dispose=undefined})
describe('actual transcript delegate card navigation',()=>{
  const dispatch={status:'dispatched',subagent_ids:['sa'],goals:['Investigate source']}
  it('completed card stays clickable after the live row is retired',()=>{
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    act(()=>$subagentsBySession.set({runtime:[]}))
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(inline).toHaveBeenCalledExactlyOnceWith('child-session','parent')
    expect(popup).not.toHaveBeenCalled()
  })
  it('historical card restores its exact link after unmount/reopen with no live state',()=>{
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    const first=render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    first.unmount()
    $subagentsBySession.set({runtime:[]})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(inline).toHaveBeenCalledExactlyOnceWith('child-session','parent')
  })
  it('off-screen child completion is captured without any delegation card mounted',()=>{
    const stop=startChildLinkHistory()
    $subagentsBySession.set({runtime:[]})
    stop()
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(inline).toHaveBeenCalledExactlyOnceWith('child-session','parent')
  })
  it('does not reuse saved links on a different connection',()=>{
    const stop=startChildLinkHistory();stop()
    $subagentsBySession.set({runtime:[]})
    vi.mocked(runtimeSessionOwner).mockReturnValue({connectionId:'server-b',profile:'default'})
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    expect(screen.getByRole('button',{name:'Investigate source'})).toHaveProperty('disabled',true)
    expect(inline).not.toHaveBeenCalled()
  })
  it('uses a durable result session id even without live state or an archive',()=>{
    $subagentsBySession.set({runtime:[]})
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={{results:[{status:'completed',session_id:'saved-child'}]}} toolCallId="call" />)
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(inline).toHaveBeenCalledExactlyOnceWith('saved-child','parent')
  })
  it('does not guess an old missing child link from another live child with the same goal',()=>{
    $subagentsBySession.set({runtime:[{id:'other',parentId:null,goal:'Investigate source',sessionId:'wrong-child',status:'running',startedAt:1,updatedAt:2,taskCount:1,taskIndex:0,filesRead:[],filesWritten:[],stream:[]} as SubagentProgress]})
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={dispatch} toolCallId="call" />)
    expect(screen.getByRole('button',{name:'Investigate source'})).toHaveProperty('disabled',true)
    expect(inline).not.toHaveBeenCalled()
  })
  it('clicking with companion plugin opens inline, never calls popup preload path',()=>{
    dispose=registry.register({id:'no-popup-test',area:'session.noSubagentPopup',data:{enabled:true}})
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={{results:[{status:'ok'}]}} toolCallId="call" />)
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(inline).toHaveBeenCalledExactlyOnceWith('child-session','parent');expect(popup).not.toHaveBeenCalled()
  })
  it('disabled plugin preserves original popup behavior',()=>{
    render(<DelegateTool args={{tasks:[{goal:'Investigate source'}]}} result={{results:[{status:'ok'}]}} toolCallId="call" />)
    fireEvent.click(screen.getByRole('button',{name:'Investigate source'}))
    expect(popup).toHaveBeenCalledExactlyOnceWith('child-session',{watch:true,parentSessionId:'parent'});expect(inline).not.toHaveBeenCalled()
  })
})
