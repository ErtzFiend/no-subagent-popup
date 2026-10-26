import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'

const [stagedArg, installedArg, outputArg] = process.argv.slice(2)
if (!stagedArg || !installedArg || !outputArg) throw Error('Usage: node scripts/package-manifest.mjs <staged-win-unpacked> <installed-win-unpacked> <output.json>')
const stage = resolve(stagedArg)
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const files = {}
function walk(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw Error(`Refusing symlink in deployable package: ${relative}`)
    if (entry.isDirectory()) walk(join(dir,entry.name),relative)
    else files[relative] = { sha256:digest(join(stage,relative)), bytes:statSync(join(stage,relative)).size }
  }
}
walk(stage)
const before = {asarSha256:digest(join(resolve(installedArg),'resources/app.asar'))}
const project=dirname(resolve(outputArg))
const result={format:2,before,files,sourceManifestSha256:digest(join(project,'manifest.json')),pluginSha256:digest(join(project,'plugin.js'))}
writeFileSync(resolve(outputArg),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({files:Object.keys(files).length,bytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),output:resolve(outputArg)}))
