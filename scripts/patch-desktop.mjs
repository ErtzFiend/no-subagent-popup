import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [mode, targetArg] = process.argv.slice(2)
if (!['check', 'apply', 'revert'].includes(mode) || !targetArg) {
  throw new Error('Usage: node scripts/patch-desktop.mjs check|apply|revert <hermes-repository>')
}
const target = resolve(targetArg, 'apps/desktop')
const manifest = JSON.parse(readFileSync(join(project, 'manifest.json'), 'utf8'))
const normalize = text => text.replace(/\r\n/g, '\n')
const digest = text => createHash('sha256').update(normalize(text)).digest('hex')
const statePath = resolve(targetArg, '.no-subagent-popup-state.json')
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null
const operations = Object.entries(manifest.files).map(([path, hashes]) => {
  const destination = join(target, path)
  const current = existsSync(destination) ? readFileSync(destination, 'utf8') : null
  const hash = current === null ? null : digest(current)
  const overlay = readFileSync(join(project, 'core', path), 'utf8')
  if (digest(overlay) !== hashes.after) throw new Error(`Corrupt overlay: ${path}`)
  if (mode === 'revert') {
    if (!state) throw new Error('No patch state exists')
    if (hash !== hashes.after) throw new Error(`Refusing to overwrite modified patched file: ${path}`)
    return { path, destination, content: state.originals[path] }
  }
  if (hash !== hashes.before && hash !== hashes.after) throw new Error(`Unsupported/modified upstream file: ${path}`)
  return { path, destination, content: overlay, original: current, already: hash === hashes.after }
})
if (mode === 'apply') {
  if (operations.every(op => op.already)) console.log('Already applied')
  else {
    if (state || operations.some(op => op.already)) throw new Error('Partial application found; refusing unsafe overwrite')
    writeFileSync(statePath, JSON.stringify({ baseCommit: manifest.baseCommit, originals: Object.fromEntries(operations.map(op => [op.path, op.original])) }, null, 2))
    for (const op of operations) { mkdirSync(dirname(op.destination), { recursive: true }); writeFileSync(op.destination, op.content) }
    console.log(`Applied ${operations.length} files; rollback originals in ${statePath}`)
  }
} else if (mode === 'revert') {
  for (const op of operations) {
    if (op.content === null) rmSync(op.destination)
    else writeFileSync(op.destination, op.content)
  }
  rmSync(statePath)
  console.log(`Reverted ${operations.length} files`)
} else console.log(`Compatible: ${operations.length} files checked against ${manifest.baseCommit}`)
