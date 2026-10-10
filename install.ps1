<#  Install "Tayny Kamchatki" menu bridge on Windows (run in elevated PowerShell).
    Example:
      .\install.ps1 -Endpoint "https://192.168.1.51:8096/rk7api/v0/xmlinterface.xml" -RkPass "134597"
    Requires Python 3 and Git in PATH. No NSSM needed (uses Scheduled Tasks).
    NOTE: keep this file ASCII-only (Windows PowerShell 5.1 misreads non-BOM UTF-8 as ANSI).
#>
param(
  [string]$Dir      = "C:\tayny-menu",
  [string]$RepoUrl  = "https://github.com/AleksTheBorsh/tayny-menu.git",
  [Parameter(Mandatory=$true)][string]$Endpoint,
  [string]$RkUser   = "menu",
  [Parameter(Mandatory=$true)][string]$RkPass,
  [string]$AdminPw  = "134597",
  [int]   $Port     = 8913
)
$ErrorActionPreference = "Stop"
function Say($s){ Write-Host "==> $s" -ForegroundColor Cyan }

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { throw "Python not found in PATH. Install from python.org (check Add to PATH)." }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git not found in PATH." }

Say "Code: clone/update in $Dir"
if (Test-Path (Join-Path $Dir ".git")) { git -C $Dir pull --quiet } else { git clone $RepoUrl $Dir }

Say "Write config.ini (no BOM)"
$cfg = "[rkeeper]`r`nendpoint = $Endpoint`r`nuser     = $RkUser`r`npass     = $RkPass`r`nadmin_pw = $AdminPw`r`n"
[System.IO.File]::WriteAllText((Join-Path $Dir "config.ini"), $cfg, (New-Object System.Text.UTF8Encoding($false)))

Say "First menu pull from R_Keeper"
Push-Location $Dir
& $py "pull.py"
if ($LASTEXITCODE -ne 0) { Write-Host "pull.py failed (check cash server reachability 192.168.x); service will still start, menu empty until refresh" -ForegroundColor Yellow }
Pop-Location

$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Say "Service task TaynyMenu (autostart)"
$a1 = New-ScheduledTaskAction -Execute $py -Argument "serve.py" -WorkingDirectory $Dir
$t1 = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "TaynyMenu" -Action $a1 -Trigger $t1 -Settings $set -RunLevel Highest -User "SYSTEM" -Force | Out-Null
Start-ScheduledTask -TaskName "TaynyMenu"

Say "Auto-update task TaynyMenuUpdate (git pull every 10 min)"
$a2 = New-ScheduledTaskAction -Execute (Join-Path $Dir "update.bat") -WorkingDirectory $Dir
$t2 = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "TaynyMenuUpdate" -Action $a2 -Trigger $t2 -Settings $set -RunLevel Highest -User "SYSTEM" -Force | Out-Null

Start-Sleep 2
Say "Done. Open http://localhost:$Port/  and  http://localhost:$Port/admin"
Write-Host ("Service state: " + (Get-ScheduledTask -TaskName TaynyMenu).State)
