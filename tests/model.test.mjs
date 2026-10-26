import assert from 'node:assert/strict'
import { test } from 'node:test'
import { liveChildren, parentOwnerMatches, parentRuntimeIds } from '../core/src/lib/no-subagent-popup-model.ts'
import { rememberInlineSubagentWatch, isInlineSubagentWatch } from '../core/src/store/subagent-watch.ts'
import plugin from '../plugin.js'
const child = (id, status = 'running', updatedAt = 1) => ({ id, sessionId: `session-${id}`, goal: id, status, updatedAt })
test('only queued/running children are visible', () => assert.deepEqual(liveChildren([['queued','running','completed','failed','interrupted','dispatched','unknown'].map((s,i) => child(String(i),s))]).map(c => c.status), ['queued','running']))
test('runtime/lineage aliases are deduplicated', () => assert.equal(liveChildren([[child('a')],[child('a')]]).length,1))
test('newer completion removes stale running state', () => assert.deepEqual(liveChildren([[child('a','completed',2)],[child('a','running',1)]]),[]))
test('terminal state wins equal timestamps in either ordering', () => {
 for (const groups of [[[child('a','completed')],[child('a')]],[[child('a')],[child('a','completed')]]]) assert.deepEqual(liveChildren(groups),[])
})
test('durable lineage maps to cached runtime, tiles and focused runtime', () => assert.deepEqual(parentRuntimeIds(['root','tip'],{r1:{storedSessionId:'root'},r2:{storedSessionId:'unrelated'}},[{storedSessionId:'tip',runtimeId:'tile'},{storedSessionId:'other',runtimeId:'not-ours'}],'focused','tip'),['root','tip','r1','tile','focused']))
test('unfocused parent does not acquire active unrelated session', () => assert.deepEqual(parentRuntimeIds(['root'],{},[],'other-runtime','other'),['root']))
test('plugin uses only explicit companion contribution seam and disposes through ctx', () => {
 const rows=[]; plugin.register({ register: item=>rows.push(item) })
 assert.deepEqual(rows,[{id:'navigation-policy',area:'session.noSubagentPopup',data:{enabled:true}}])
})
test('same-window watcher survives reload storage and never marks parent as read-only', () => {
 const data = new Map(); globalThis.window={location:{hash:'#/child%20watch'},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}}
 rememberInlineSubagentWatch('child watch'); assert.equal(isInlineSubagentWatch(),true); assert.equal(isInlineSubagentWatch('parent'),false)
 data.set('hermes.no-subagent-popup.watch',JSON.stringify(['restored-child']))
 assert.equal(isInlineSubagentWatch('restored-child'),true)
 window.location.hash='#/%E0%A4%A'; assert.equal(isInlineSubagentWatch(),false)
 delete globalThis.window
})
test('storage failure cannot break spectator guard', () => {
 globalThis.window={location:{hash:'#/blocked-storage'},sessionStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}}
 rememberInlineSubagentWatch('blocked-storage');assert.equal(isInlineSubagentWatch(),true);delete globalThis.window
})

test('matching stored IDs on different connections never share child runtime buckets', () => {
 const expected={connectionId:'home',profile:'default'}
 const owners={homeRuntime:expected,workRuntime:{connectionId:'work',profile:'default'},otherProfile:{connectionId:'home',profile:'work'}}
 const ids=parentRuntimeIds(['same-root'],Object.fromEntries(Object.keys(owners).map(id=>[id,{storedSessionId:'same-root'}])),[],'workRuntime','same-root',id=>parentOwnerMatches(expected,owners[id]))
 assert.deepEqual(ids,['homeRuntime'])
})
test('exact owner fails closed while legacy default sessions continue to match', () => {
 assert.equal(parentOwnerMatches({connectionId:'home',profile:'default'},undefined),false)
 assert.equal(parentOwnerMatches({connectionId:'home',profile:'default'},'default'),false)
 assert.equal(parentOwnerMatches({},undefined),true)
 assert.equal(parentOwnerMatches({profile:'media'},'media'),true)
 assert.equal(parentOwnerMatches({profile:'work'},'media'),false)
})
