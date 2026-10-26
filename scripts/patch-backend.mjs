import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,existsSync,mkdirSync,rmSync,renameSync} from 'node:fs'
import {resolve,dirname,join,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const [mode,targetArg]=process.argv.slice(2)
if(!['check','apply','revert'].includes(mode)||!targetArg)throw Error('Usage: node scripts/patch-backend.mjs check|apply|revert <hermes-source-root>')
const root=resolve(targetArg),manifest=JSON.parse(readFileSync(join(project,'backend/manifest.json'),'utf8'))
const digest=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex')
const statePath=join(root,'.no-subagent-popup-backend-state.json')
const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):null
const operations=Object.entries(manifest.files).map(([rel,hashes])=>{
 const target=resolve(root,rel)
 if(!target.startsWith(root+sep))throw Error('Unsafe manifest path')
 const current=existsSync(target)?readFileSync(target,'utf8'):null
 const hash=current===null?null:digest(current)
 const source=readFileSync(join(project,'backend/core',rel),'utf8')
 if(digest(source)!==hashes.after)throw Error(`Corrupt overlay: ${rel}`)
 if(mode==='revert'){
  if(!state||hash!==hashes.after)throw Error(`No state or changed installed source: ${rel}`)
  return {rel,target,content:state.originals[rel]}
 }
 if(hash!==hashes.before&&hash!==hashes.after)throw Error(`Unsupported or modified backend: ${rel}`)
 return {rel,target,content:source,original:current,already:hash===hashes.after}
})
if(mode==='check')console.log(`Compatible: ${operations.length} backend files checked`)
if(mode==='apply'){
 if(operations.every(op=>op.already))console.log('Already applied; no changes')
 else{
  if(state||operations.some(op=>op.already))throw Error('Partial application; refusing overwrite')
  writeFileSync(statePath,JSON.stringify({originals:Object.fromEntries(operations.map(op=>[op.rel,op.original]))},null,2))
  for(const op of operations){mkdirSync(dirname(op.target),{recursive:true});writeFileSync(op.target+'.nsp-new',op.content);renameSync(op.target+'.nsp-new',op.target)}
  console.log(`Applied ${operations.length} backend files. Restart/roll over the backend safely to activate; this tool does not restart it.`)
 }
}
if(mode==='revert'){
 for(const op of operations){writeFileSync(op.target+'.nsp-new',op.content);renameSync(op.target+'.nsp-new',op.target)}
 rmSync(statePath);console.log(`Reverted ${operations.length} backend files. A safe backend restart is required.`)
}
