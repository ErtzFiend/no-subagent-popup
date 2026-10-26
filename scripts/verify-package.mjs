import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const [desktopArg, packageArg] = process.argv.slice(2)
if (!desktopArg || !packageArg) throw Error('Usage: node scripts/verify-package.mjs <desktop-source-dir> <win-unpacked-dir>')
const desktop = resolve(desktopArg)
const app = resolve(packageArg)
const asar = createRequire(join(desktop, 'package.json'))('@electron/asar')
const archive = join(app, 'resources/app.asar')
const files = asar.listPackage(archive).map(p => p.replace(/^[\\/]/, ''))
const indexPath = files.find(p => p.replaceAll('\\','/') === 'dist/index.html')
if (!indexPath) throw Error('Packaged renderer entry missing')
const index = asar.extractFile(archive,indexPath).toString('utf8')
const scripts = [...index.matchAll(/src="(?:\.\/|\/)?(assets\/[^"\s]+\.js)"/g)].map(m=>m[1])
if (!scripts.length) throw Error('Packaged HTML has no renderer script')
const entry = scripts.find(p=>p.startsWith('assets/index-')) || scripts[0]
const entryPath = files.find(p=>p.replaceAll('\\','/') === `dist/${entry}`)
if (!entryPath) throw Error('Packaged renderer script missing from ASAR header')
const text = asar.extractFile(archive,entryPath).toString('utf8')
const markers = ['session.noSubagentPopup','sidebar-live-subagents','sidebar-running-subagent','hermes.no-subagent-popup.watch','no-subagent-popup@0.1.2']
const markerFiles = {}
for (const file of files.filter(p=>p.replaceAll('\\','/').startsWith('dist/assets/') && p.endsWith('.js'))) {
  const contents=asar.extractFile(archive,file).toString('utf8')
  for (const marker of markers) if (contents.includes(marker)) markerFiles[marker]=file
}
for (const marker of markers) if (!markerFiles[marker]) throw Error(`Packaged patch marker missing: ${marker}`)
const mainPath=files.find(p=>p.replaceAll('\\','/')==='dist/electron-main.mjs')
if(!mainPath || !asar.extractFile(archive,mainPath).length) throw Error('Packaged Electron main missing')
const exe=readFileSync(join(app,'Hermes.exe'))
if(exe[0]!==0x4d || exe[1]!==0x5a) throw Error('Missing Windows executable PE signature')
console.log(JSON.stringify({passed:true,kind:'packaged-structure-and-patch-verification',renderer:entry,patchMarkers:markerFiles,archiveEntries:files.length,exeBytes:exe.length},null,2))
