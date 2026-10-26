import React from 'react'
import {createRoot} from 'react-dom/client'
import {DelegateTool} from '@/components/assistant-ui/tool/delegate'
import {SidebarSessionRow} from '@/app/chat/sidebar/session-row'
import {registry} from '@/contrib/registry'
import {$activeSessionId,$selectedStoredSessionId,$sessions} from '@/store/session'
import {$sessionStates} from '@/store/session-states'
import {$subagentsBySession,type SubagentProgress} from '@/store/subagents'
import {isWatchWindow} from '@/store/windows'
import './styles.css'

const parent={id:'parent-session',title:'Main session',source:'local',started_at:Date.now()/1000,last_active:Date.now()/1000,message_count:2,tool_call_count:1,input_tokens:0,output_tokens:0,model:'test-fixture',preview:null,cwd:null,git_branch:null}
const child=(id:string,status:SubagentProgress['status']='running'):SubagentProgress=>({id,sessionId:'child-'+id,parentId:null,goal:'Inspect '+id,status,taskCount:2,taskIndex:0,startedAt:Date.now()/1000,updatedAt:Date.now()/1000,filesRead:[],filesWritten:[],stream:[]})
$sessions.set([parent]);$activeSessionId.set('parent-runtime');$selectedStoredSessionId.set(parent.id)
// Store ownership and binding mirror a real open parent; no gateway or LLM request is made.
$sessionStates.set({})
$subagentsBySession.set({'parent-runtime':[child('alpha'),child('beta')]})
let dispose=registry.register({id:'fixture-policy',area:'session.noSubagentPopup',data:{enabled:true}})
Object.assign(window,{fixture:{
 complete:(id:string)=>$subagentsBySession.set({'parent-runtime':$subagentsBySession.get()['parent-runtime'].map(c=>c.id===id?{...c,status:'completed'}:c)}),
 status:()=>({popupCount:(window as any).__popupCount,watch:isWatchWindow(),hash:window.location.hash}),
 disable:()=>dispose(),
}})
function App(){return <main style={{fontFamily:'system-ui',background:'#151519',color:'#eee',minHeight:'100vh',display:'flex',padding:24,gap:28}}>
 <aside style={{width:300,flexShrink:0}}><h2 style={{fontSize:16}}>Sessions</h2><SidebarSessionRow session={parent} isPinned={false} isSelected={true} unread={false}
 onArchive={()=>{}} onDelete={()=>{}} onPin={()=>{}} onToggleUnread={()=>{}} onResume={()=>{window.location.hash='/parent-session'}} /></aside>
 <section style={{flex:1}}><h1 style={{fontSize:22}}>No Subagent Popup</h1><p>Browser integration fixture — actual patched Hermes components, synthetic test data.</p>
 <DelegateTool args={{tasks:[{goal:'Inspect alpha'},{goal:'Inspect beta'}]}} result={{status:'dispatched'}} toolCallId="fixture" />
 <p style={{fontSize:12,opacity:.6}}>Expand/collapse left. Click either child or its delegation card: same window, read-only watch.</p></section>
 </main>}
createRoot(document.getElementById('root')!).render(<App />)
