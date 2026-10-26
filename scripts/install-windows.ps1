param(
  [string]$InstalledApp = "$env:LOCALAPPDATA\hermes\hermes-agent\apps\desktop\release\win-unpacked",
  [string]$StagedApp = "$env:LOCALAPPDATA\no-subagent-popup\hermes-worktree\apps\desktop\release\win-unpacked",
  [string]$Project = "$env:LOCALAPPDATA\no-subagent-popup\project",
  [string]$HermesHome = "$env:LOCALAPPDATA\hermes",
  [string]$StatePath = "$env:LOCALAPPDATA\no-subagent-popup\install-state.json",
  [string]$PreviousManifest,
  [switch]$CheckOnly
)
$ErrorActionPreference='Stop'
function Hash([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Same-Path([string]$Left,[string]$Right) {
  if(!$Left -or !$Right){return $false}
  return [IO.Path]::GetFullPath($Left).TrimEnd('\') -ieq [IO.Path]::GetFullPath($Right).TrimEnd('\')
}
function Assert-Package([string]$Root,$Files) {
  $entries=@($Files.PSObject.Properties)
  if(!$entries.Count){throw 'Package inventory is empty'}
  $prefix=[IO.Path]::GetFullPath($Root).TrimEnd('\')+'\'
  foreach($p in $entries) {
    $file=[IO.Path]::GetFullPath((Join-Path $Root $p.Name.Replace('/','\')))
    if(!$file.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Package inventory contains an unsafe path'}
    if($p.Value.sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'Package inventory contains an invalid checksum'}
    if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Package file missing: $($p.Name)"}
    if((Hash $file) -ne $p.Value.sha256){throw "Package hash mismatch: $($p.Name)"}
  }
  if(@(Get-ChildItem -LiteralPath $Root -Recurse -File -Force).Count -ne $entries.Count){throw 'Package contains untracked files; refusing drift'}
}
$exePath=[IO.Path]::GetFullPath((Join-Path $InstalledApp 'Hermes.exe'))
foreach($p in @(Get-Process -Name 'Hermes' -ErrorAction SilentlyContinue)){$pp=$null;try{$pp=$p.Path}catch{};if($pp -and ([IO.Path]::GetFullPath($pp) -ieq $exePath)){throw 'Hermes is still running. Fully exit it, including the tray icon, then run this installer. No process was stopped.'}}
$manifest=Get-Content (Join-Path $Project 'package-manifest.json') -Raw|ConvertFrom-Json
if($manifest.format -ne 2){throw 'Package predates source-freshness verification. Rebuild/regenerate the package before installation.'}
if((Hash (Join-Path $Project 'manifest.json')) -ne $manifest.sourceManifestSha256){throw 'Project source changed after packaging. Refusing to install a stale staged build.'}
$pluginSource=Join-Path $Project 'plugin.js'
$pluginHash=Hash $pluginSource
if($pluginHash -ne $manifest.pluginSha256){throw 'Companion plugin changed after packaging. Rebuild/regenerate the package first.'}
$pluginRoot=Join-Path $HermesHome 'desktop-plugins\no-subagent-popup'
$currentHash=Hash (Join-Path $InstalledApp 'resources\app.asar')
$previous=$null;$stateBytes=$null;$oldFiles=$null
if(Test-Path -LiteralPath $StatePath) {
  $stateBytes=[IO.File]::ReadAllBytes($StatePath)
  $previous=Get-Content -LiteralPath $StatePath -Raw|ConvertFrom-Json
  if($previous.format -notin @(1,2) -or !(Same-Path $previous.installedApp $InstalledApp) -or !(Same-Path $previous.pluginRoot $pluginRoot)){throw 'Existing install state targets a different installation'}
  if($currentHash -ne $previous.asarSha256){throw 'Installed app differs from tracked state; refusing update'}
  if((Hash (Join-Path $pluginRoot 'plugin.js')) -ne $previous.pluginSha256){throw 'Installed plugin differs from tracked state; refusing update'}
  if($previous.format -eq 2 -and $previous.installedFiles) {
    $oldFiles=$previous.installedFiles
  } else {
    if(!$PreviousManifest){$PreviousManifest=Join-Path $Project 'artifacts\package-manifest.json'}
    if(!(Test-Path -LiteralPath $PreviousManifest)){throw 'Previous full-package manifest is required to verify legacy install state'}
    $oldManifest=Get-Content -LiteralPath $PreviousManifest -Raw|ConvertFrom-Json
    $archiveEntries=@($oldManifest.files.PSObject.Properties|Where-Object {$_.Name.Replace('/','\') -ieq 'resources\app.asar'})
    if($archiveEntries.Count -ne 1 -or $archiveEntries[0].Value.sha256 -ne $previous.asarSha256 -or $oldManifest.pluginSha256 -ne $previous.pluginSha256){throw 'Previous manifest does not match the tracked installed version'}
    $oldFiles=$oldManifest.files
  }
  Assert-Package $InstalledApp $oldFiles
  if((Hash (Join-Path $previous.backup 'resources\app.asar')) -ne $previous.originalAsarSha256){throw 'Original rollback backup hash mismatch'}
} elseif($currentHash -ne $manifest.before.asarSha256) {
  throw 'Installed app changed since preparation. Refusing to overwrite an unreviewed version.'
}
Assert-Package $StagedApp $manifest.files
if($CheckOnly){Write-Output '{"status":"preflight_passed","changed":false}';exit 0}
$stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$originalBackup=if($previous){$previous.backup}else{"$InstalledApp.before-no-subagent-popup-$stamp"}
$appHold=if($previous){"$InstalledApp.previous-no-subagent-popup-$stamp"}else{$originalBackup}
$incoming="$InstalledApp.no-subagent-popup-new-$stamp"
$pluginHold=Join-Path (Split-Path $StatePath) "backups\plugin-$stamp"
$pending="$StatePath.pending-$stamp"
New-Item -ItemType Directory -Path (Split-Path $pluginHold),(Split-Path $StatePath) -Force|Out-Null
Copy-Item -LiteralPath $StagedApp -Destination $incoming -Recurse
try {Assert-Package $incoming $manifest.files}catch{Remove-Item -LiteralPath $incoming -Recurse -Force;throw}
$appMoved=$false;$pluginMoved=$false;$pluginCreated=$false;$stateTouched=$false
try {
  Move-Item -LiteralPath $InstalledApp -Destination $appHold
  $appMoved=$true
  Move-Item -LiteralPath $incoming -Destination $InstalledApp
  if(Test-Path -LiteralPath $pluginRoot){Move-Item -LiteralPath $pluginRoot -Destination $pluginHold;$pluginMoved=$true}
  New-Item -ItemType Directory -Path $pluginRoot -Force|Out-Null
  $pluginCreated=$true
  Copy-Item -LiteralPath $pluginSource -Destination (Join-Path $pluginRoot 'plugin.js')
  Assert-Package $InstalledApp $manifest.files
  if((Hash (Join-Path $pluginRoot 'plugin.js')) -ne $pluginHash){throw 'Installed plugin readback failed'}
  $originalPluginBackup=if($previous){$previous.pluginBackup}elseif($pluginMoved){$pluginHold}else{$null}
  $originalHash=if($previous){$previous.originalAsarSha256}else{$currentHash}
  $state=@{format=2;originalAsarSha256=$originalHash;installedApp=$InstalledApp;backup=$originalBackup;pluginRoot=$pluginRoot;pluginBackup=$originalPluginBackup;pluginSha256=$pluginHash;asarSha256=(Hash (Join-Path $InstalledApp 'resources\app.asar'));installedFiles=$manifest.files;status='installed_requires_user_launch';previousPatchedApp=$(if($previous){$appHold}else{$null});previousPatchedPlugin=$(if($previous -and $pluginMoved){$pluginHold}else{$null})}
  $state|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $pending -Encoding UTF8
  $stateTouched=$true
  Move-Item -LiteralPath $pending -Destination $StatePath -Force
  $readback=Get-Content -LiteralPath $StatePath -Raw|ConvertFrom-Json
  if($readback.asarSha256 -ne $state.asarSha256 -or $readback.pluginSha256 -ne $pluginHash -or !(Same-Path $readback.backup $originalBackup)){throw 'Installation state readback failed'}
  @{status=$state.status;format=2;updated=([bool]$previous);installedApp=$InstalledApp;backup=$originalBackup;previousPatchedApp=$state.previousPatchedApp;verifiedFiles=@($manifest.files.PSObject.Properties).Count}|ConvertTo-Json
} catch {
  $failure=$_
  if($appMoved){
    if(Test-Path -LiteralPath $InstalledApp){Move-Item -LiteralPath $InstalledApp -Destination "$InstalledApp.failed-$stamp"}
    Move-Item -LiteralPath $appHold -Destination $InstalledApp
  }
  if($pluginCreated -and (Test-Path -LiteralPath $pluginRoot)){Remove-Item -LiteralPath $pluginRoot -Recurse -Force}
  if($pluginMoved){Move-Item -LiteralPath $pluginHold -Destination $pluginRoot}
  if($stateTouched){if($stateBytes){[IO.File]::WriteAllBytes($StatePath,$stateBytes)}elseif(Test-Path -LiteralPath $StatePath){Remove-Item -LiteralPath $StatePath -Force}}
  if(Test-Path -LiteralPath $pending){Remove-Item -LiteralPath $pending -Force}
  if(Test-Path -LiteralPath $incoming){Remove-Item -LiteralPath $incoming -Recurse -Force}
  throw $failure
}
# Deliberately no process launch: open Hermes normally from the interactive launcher.
