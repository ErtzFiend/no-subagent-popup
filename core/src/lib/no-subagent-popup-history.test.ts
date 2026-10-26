import { describe, expect, it } from 'vitest'
import type { DelegateRow } from '@/components/assistant-ui/tool/delegate-model'
import { delegateRowsFromCall, mergeDelegateRows } from '@/components/assistant-ui/tool/delegate-model'
import type { SubagentProgress } from '@/store/subagents'
import { DELEGATE_HISTORY_KEY, delegateHistoryScope, rememberDelegateLinks, restoreDelegateLinks } from './no-subagent-popup-history'

const owner={connectionId:'a',profile:'default'}
const scope=delegateHistoryScope(owner,'parent','children')
const dispatched:DelegateRow[]=[{id:'call:0',subagentId:'sa',goal:'same goal',activity:[],status:'dispatched'}]
const completed:DelegateRow[]=[{...dispatched[0],sessionId:'stored-child',status:'completed'}]
const memory=()=>{const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)}}}

describe('durable completed-child links',()=>{
  it('restores a completed exact child after serialization and an empty live store',()=>{
    const storage=memory();rememberDelegateLinks(dispatched,completed,scope,storage)
    expect(restoreDelegateLinks(dispatched,scope,storage)[0]).toMatchObject({sessionId:'stored-child',status:'completed'})
  })
  it.each([
    [{connectionId:'b',profile:'default'},'parent'],
    [{connectionId:'a',profile:'work'},'parent'],
    [owner,'other-parent']
  ] as const)('isolates connection/profile/parent scope %#',(route,parent)=>{
    const storage=memory();rememberDelegateLinks(dispatched,completed,scope,storage)
    expect(restoreDelegateLinks(dispatched,delegateHistoryScope(route,parent,'children'),storage)[0].sessionId).toBeUndefined()
  })
  it('unknown ownership fails closed, instead of collapsing into the default connection',()=>{
    expect(delegateHistoryScope(undefined,'parent','children')).toBeNull()
    expect(delegateHistoryScope(owner,null,'children')).toBeNull()
  })
  it('never restores or archives a goal/index-only match',()=>{
    const storage=memory();rememberDelegateLinks(dispatched,[{...completed[0],subagentId:'other'}],scope,storage)
    expect(restoreDelegateLinks(dispatched,scope,storage)[0].sessionId).toBeUndefined()
  })
  it('retains a link but does not restore cached running liveness after reload',()=>{
    const storage=memory();rememberDelegateLinks(dispatched,[{...completed[0],status:'running'}],scope,storage)
    expect(restoreDelegateLinks(dispatched,scope,storage)[0]).toMatchObject({sessionId:'stored-child',status:'dispatched'})
  })
  it('retains failed and interrupted transcripts too',()=>{
    for(const status of ['failed','interrupted'] as const){
      const storage=memory();rememberDelegateLinks(dispatched,[{...completed[0],status}],scope,storage)
      expect(restoreDelegateLinks(dispatched,scope,storage)[0]).toMatchObject({sessionId:'stored-child',status})
    }
  })
  it('ignores malformed local data and survives quota or storage refusal',()=>{
    const storage=memory();storage.setItem(DELEGATE_HISTORY_KEY,'{bad')
    expect(restoreDelegateLinks(dispatched,scope,storage)).toEqual(dispatched)
    const denied={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')}}
    expect(()=>rememberDelegateLinks(dispatched,completed,scope,denied)).not.toThrow()
    expect(restoreDelegateLinks(dispatched,scope,denied)).toEqual(dispatched)
  })
  it('does not persist goals, summaries, activity, model or credential data',()=>{
    const storage=memory();rememberDelegateLinks(dispatched,[{...completed[0],goal:'PRIVATE GOAL',activity:['PRIVATE TEXT'],model:'private-model'}],scope,storage)
    const encoded=storage.getItem(DELEGATE_HISTORY_KEY)!
    expect(encoded).not.toContain('PRIVATE');expect(encoded).not.toContain('private-model')
  })
  it('parses durable session IDs and recovery IDs without live progress',()=>{
    for(const entry of [{session_id:'s'},{child_session_id:'s'},{recovery:{child_session_id:'s'}}]){
      expect(delegateRowsFromCall({tasks:[{goal:'g'}]},{results:[{status:'completed',...entry}]},'call')[0].sessionId).toBe('s')
    }
  })
  it('a persisted dispatch child ID cannot be hijacked by a same-goal live worker',()=>{
    const foreign={id:'other',sessionId:'wrong',goal:'same goal',status:'running',taskIndex:0} as SubagentProgress
    expect(mergeDelegateRows(completed,[foreign],'call')[0].sessionId).toBe('stored-child')
  })
})
