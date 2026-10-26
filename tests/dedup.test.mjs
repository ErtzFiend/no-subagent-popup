import assert from 'node:assert/strict'
import {test} from 'node:test'
const {duplicateChildRows}=await import(process.env.NSP_DEDUP_MODEL || '../core/src/lib/no-subagent-popup-model.ts')
const parent={id:'parent',profile:'default',connection_id:'home'}
const child={id:'child',profile:'default',connection_id:'home',title:'Subagent: work'}
const live={id:'sa',sessionId:'child',goal:'work',status:'running',updatedAt:1}
const roster=p=>p===parent?[live]:[]
test('suppresses only the exact live child represented under its visible parent',()=>{
 const other={...child,id:'unrelated'};assert.deepEqual(duplicateChildRows([parent,child,other],roster),[parent,other])
})
test('preserves cross-connection ID collisions',()=>{
 const other={...child,connection_id:'work'};assert.deepEqual(duplicateChildRows([parent,other],roster),[parent,other])
})
test('preserves cross-profile ID collisions',()=>{
 const other={...child,profile:'work'};assert.deepEqual(duplicateChildRows([parent,other],roster),[parent,other])
})
test('recognizes an exact compression-lineage session ID',()=>{
 const tip={...child,id:'tip',_lineage_root_id:'child'};assert.deepEqual(duplicateChildRows([parent,tip],roster),[parent])
})
test('preserves child-only search lists and does not infer identity from titles',()=>{
 assert.deepEqual(duplicateChildRows([child],roster),[child]);const other={...child,id:'other'};assert.deepEqual(duplicateChildRows([parent,other],roster),[parent,other])
})
test('unlinked live workers do not hide saved conversations',()=>{
 assert.deepEqual(duplicateChildRows([parent,child],()=>[{...live,sessionId:undefined}]),[parent,child])
})
test('terminal work no longer duplicates a dotted row; saved history remains accessible',()=>{
 assert.deepEqual(duplicateChildRows([parent,child],()=>[{...live,status:'completed'}]),[parent,child])
})
