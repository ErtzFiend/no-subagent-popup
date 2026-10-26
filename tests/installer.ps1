param([string]$Project="$env:LOCALAPPDATA\no-subagent-popup\project")
$ErrorActionPreference='Stop'
$root=Join-Path $env:LOCALAPPDATA ('no-subagent-popup\installer-test-'+[Guid]::NewGuid().ToString('N'))
$old=Join-Path $root 'installed';$new=Join-Path $root 'staged';$projectFixture=Join-Path $root 'project';$fixtureHome=Join-Path $root 'home';$state=Join-Path $root 'state.json'
New-Item -ItemType Directory -Path "$old\resources","$new\resources",$projectFixture,"$fixtureHome\desktop-plugins\no-subagent-popup" -Force | Out-Null
Set-Content "$old\Hermes.exe" 'old executable fixture' -Encoding ASCII
Set-Content "$old\resources\app.asar" 'old archive fixture' -Encoding ASCII
Set-Content "$new\Hermes.exe" 'new executable fixture' -Encoding ASCII
Set-Content "$new\resources\app.asar" 'new archive fixture' -Encoding ASCII
Set-Content "$fixtureHome\desktop-plugins\no-subagent-popup\plugin.js" 'previous plugin fixture' -Encoding ASCII
Copy-Item "$Project\plugin.js" "$projectFixture\plugin.js"
Copy-Item "$Project\manifest.json" "$projectFixture\manifest.json"
& node "$Project\scripts\package-manifest.mjs" $new $old "$projectFixture\package-manifest.json"
if($LASTEXITCODE -ne 0){throw 'Fixture manifest creation failed'}
$before=(Get-FileHash "$old\resources\app.asar").Hash
& "$Project\scripts\install-windows.ps1" -InstalledApp $old -StagedApp $new -Project $projectFixture -HermesHome $fixtureHome -StatePath $state -CheckOnly
if(Test-Path $state){throw 'Preflight unexpectedly wrote install state'}
$sourceManifest=Get-Content "$projectFixture\manifest.json" -Raw
Add-Content "$projectFixture\manifest.json" ' '
$staleBlocked=$false
try {& "$Project\scripts\install-windows.ps1" -InstalledApp $old -StagedApp $new -Project $projectFixture -HermesHome $fixtureHome -StatePath $state -CheckOnly} catch {
 if($_.Exception.Message -like 'Project source changed after packaging*'){$staleBlocked=$true}else{throw}
}
if(!$staleBlocked){throw 'Installer accepted stale source/package mismatch'}
Copy-Item "$Project\manifest.json" "$projectFixture\manifest.json" -Force
& "$Project\scripts\install-windows.ps1" -InstalledApp $old -StagedApp $new -Project $projectFixture -HermesHome $fixtureHome -StatePath $state
$installedState=Get-Content $state -Raw | ConvertFrom-Json
if((Get-FileHash "$old\resources\app.asar").Hash -ne (Get-FileHash "$new\resources\app.asar").Hash){throw 'Install readback failed'}
if((Get-FileHash "$fixtureHome\desktop-plugins\no-subagent-popup\plugin.js").Hash -ne (Get-FileHash "$Project\plugin.js").Hash){throw 'Plugin installation failed'}
# Modifying the installed plugin must block rollback without changing the app.
Add-Content "$fixtureHome\desktop-plugins\no-subagent-popup\plugin.js" 'tampered'
$blocked=$false
try {& "$Project\scripts\rollback-windows.ps1" -StatePath $state} catch {$blocked=$true}
if(!$blocked){throw 'Rollback did not reject tampered plugin'}
Copy-Item "$Project\plugin.js" "$fixtureHome\desktop-plugins\no-subagent-popup\plugin.js" -Force
& "$Project\scripts\rollback-windows.ps1" -StatePath $state
if((Get-FileHash "$old\resources\app.asar").Hash -ne $before){throw 'Original archive not restored'}
if((Get-Content "$fixtureHome\desktop-plugins\no-subagent-popup\plugin.js" -Raw).Trim() -ne 'previous plugin fixture'){throw 'Previous plugin not restored'}
@{passed=$true;kind='synthetic-filesystem-installer-test';checks=@('preflight_no_write','stale_source_package_blocked','app_hash_readback','plugin_hash_readback','tampered_plugin_rollback_blocked','original_app_restored','previous_plugin_restored')} | ConvertTo-Json
Remove-Item -LiteralPath $root -Recurse -Force
