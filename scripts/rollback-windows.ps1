param([string]$StatePath="$env:LOCALAPPDATA\no-subagent-popup\install-state.json")
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $StatePath)){throw 'No installation state found; nothing to roll back'}
$state=Get-Content -LiteralPath $StatePath -Raw|ConvertFrom-Json
function Hash([string]$p) { (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant() }
$exePath=[IO.Path]::GetFullPath((Join-Path $state.installedApp 'Hermes.exe'))
foreach($p in @(Get-Process -Name 'Hermes' -ErrorAction SilentlyContinue)){$pp=$null;try{$pp=$p.Path}catch{};if($pp -and ([IO.Path]::GetFullPath($pp) -ieq $exePath)){throw 'Fully exit Hermes, including the tray icon, before rollback. No process was stopped.'}}
if(!(Test-Path -LiteralPath $state.backup)) {throw 'Original application backup is missing'}
$actual=Hash (Join-Path $state.installedApp 'resources/app.asar')
if($actual -ne $state.asarSha256) {throw 'Current application changed since installation; refusing rollback overwrite'}
$original=Hash (Join-Path $state.backup 'resources/app.asar')
if($original -ne $state.originalAsarSha256) {throw 'Original backup hash mismatch'}
if((Hash (Join-Path $state.pluginRoot 'plugin.js')) -ne $state.pluginSha256) {throw 'Plugin changed since installation; refusing to remove it'}
if($state.format -ge 2 -and $state.installedFiles) {
  $tracked=@($state.installedFiles.PSObject.Properties).Count
  $count=@(Get-ChildItem -LiteralPath $state.installedApp -Recurse -File -Force).Count
  if($count -ne $tracked){throw "File count drift ($count files present vs $tracked tracked) - refusing rollback"}
}
$stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$removed="$($state.installedApp).no-subagent-popup-removed-$stamp"
Move-Item -LiteralPath $state.installedApp -Destination $removed
try {
  Move-Item -LiteralPath $state.backup -Destination $state.installedApp
  if((Hash (Join-Path $state.installedApp 'resources/app.asar')) -ne $state.originalAsarSha256){throw 'Rollback readback failed'}
} catch { Move-Item -LiteralPath $removed -Destination $state.installedApp; throw }
# Remove the patched plugin; restore the ORIGINAL plugin only if one existed before the first install.
if($state.pluginBackup -and (Test-Path -LiteralPath $state.pluginBackup)) {
  Move-Item -LiteralPath $state.pluginRoot -Destination "$($state.pluginRoot).removed-$stamp"
  Move-Item -LiteralPath $state.pluginBackup -Destination $state.pluginRoot
} else {
  Remove-Item -LiteralPath $state.pluginRoot -Recurse -Force
}
$restored=Hash (Join-Path $state.installedApp 'resources/app.asar')
if($restored -ne $state.originalAsarSha256) {throw 'Rollback readback failed'}
$hadOriginalPlugin=$false
if($state.pluginBackup -and (Test-Path -LiteralPath $state.pluginBackup)){$hadOriginalPlugin=$true}
$prevPatched=$null
if($state.PSObject.Properties['previousPatchedApp']){$prevPatched=$state.previousPatchedApp}
Move-Item -LiteralPath $StatePath -Destination "$StatePath.rolled-back-$stamp"
@{status='rollback_verified_requires_user_launch';format=$state.format;asarSha256=$restored;retainedPatchedApp=$removed;previousPatchedAppRetained=$prevPatched;originalPluginRestored=$hadOriginalPlugin}|ConvertTo-Json
