import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { $activeSessionId, $selectedStoredSessionId, $sessions } from '@/store/session'
import { $sessionStates, $sessionTiles } from '@/store/session-states'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'
import type { SessionInfo } from '@/types/hermes'
import { useDottedChildFilter } from './parent-subagents'
import { RunningSubagentRows } from './running-subagent-rows'
const { navigate, enabled } = vi.hoisted(() => ({ navigate: vi.fn(), enabled: {value:true} }))
vi.mock('@/lib/no-subagent-popup', () => ({ useNoSubagentPopup: () => enabled.value }))
vi.mock('@/lib/open-subagent-in-current-window', () => ({ openSubagentInCurrentWindow: navigate }))
vi.mock('@/app/chat/composer/status-stack/use-subagent-snapshot', () => ({ useSubagentSnapshot: vi.fn() }))
const parent={id:'parent',title:'Parent'} as SessionInfo
const childSession={id:'child',parent_session_id:'parent',title:'Subagent: work'} as SessionInfo
const progress={id:'sa',parentId:null,sessionId:'child',goal:'work',status:'running',startedAt:1,updatedAt:1,taskIndex:0,taskCount:1,filesRead:[],filesWritten:[],stream:[]} as SubagentProgress
function Fixture({items=[parent,childSession]}:{items?:SessionInfo[]}){
 const filter=useDottedChildFilter()
 return <>{filter(items).map(item=><div key={`${item.connection_id}:${item.id}`}><span>{item.title}</span>{enabled.value && <RunningSubagentRows session={item}/>}</div>)}</>
}
beforeEach(()=>{
 enabled.value=true;vi.clearAllMocks();$sessions.set([parent,childSession]);$sessionStates.set({});$sessionTiles.set([])
 $activeSessionId.set('runtime');$selectedStoredSessionId.set('parent');$subagentsBySession.set({runtime:[progress]})
})
afterEach(cleanup)
describe('one sidebar representation per live child',()=>{
 it('keeps dotted rows and removes the duplicate ordinary tree entry',()=>{
  render(<Fixture/>);expect(screen.getByRole('button',{name:'Watch subagent: work'})).toBeTruthy()
  expect(screen.queryByText('Subagent: work')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Watch subagent: work'}));expect(navigate).toHaveBeenCalledExactlyOnceWith('child','runtime')
 })
 it('does not reveal the duplicate when the dotted group collapses',()=>{
  render(<Fixture/>);fireEvent.click(screen.getByRole('button',{name:'Running subagents'}))
  expect(screen.queryByText('Subagent: work')).toBeNull();expect(screen.queryByRole('button',{name:'Watch subagent: work'})).toBeNull()
 })
 it('restores original ordinary rows when the plugin is disabled',()=>{
  enabled.value=false;render(<Fixture/>);expect(screen.getByText('Subagent: work')).toBeTruthy()
  expect(screen.queryByRole('button',{name:'Watch subagent: work'})).toBeNull()
 })
 it('preserves an orphan/search result when its parent is not in that list',()=>{
  render(<Fixture items={[childSession]}/>);expect(screen.getByText('Subagent: work')).toBeTruthy()
 })
 it('preserves an exact-ID collision belonging to another connection',()=>{
  render(<Fixture items={[parent,{...childSession,connection_id:'other'}]}/>);expect(screen.getByText('Subagent: work')).toBeTruthy()
 })
 it('removes terminal work from dotted rows without deleting the saved session',()=>{
  render(<Fixture/>);act(()=>$subagentsBySession.set({runtime:[{...progress,status:'completed',updatedAt:2}]}))
  expect(screen.queryByRole('button',{name:'Watch subagent: work'})).toBeNull();expect(screen.getByText('Subagent: work')).toBeTruthy()
 })
})
