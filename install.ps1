<#  Установка витрины «Тайны Камчатки» на Windows-сервер (запускать в PowerShell от админа).
    Пример:
      .\install.ps1 -Endpoint "https://192.168.1.206:8096/rk7api/v0/xmlinterface.xml" -RkPass "134597"
    Ставит: клон репозитория, config.ini, первую выгрузку меню, службу (Планировщик) и авто-апдейт.
    Зависимости: Python 3 и Git должны быть установлены (в PATH). NSSM не нужен.
#>
param(
  [string]$Dir      = "C:\tayny-menu",
  [string]$RepoUrl  = "https://github.com/AleksTheBorsh/tayny-menu.git",
  [Parameter(Mandatory=$true)][string]$Endpoint,   # адрес XML R_Keeper по локальной сети
  [string]$RkUser   = "menu",
  [Parameter(Mandatory=$true)][string]$RkPass,
  [string]$AdminPw  = "134597",
  [int]   $Port     = 8913
)
$ErrorActionPreference = "Stop"
function Say($s){ Write-Host "==> $s" -ForegroundColor Cyan }

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { throw "Python не найден в PATH. Установите python.org (галочка Add to PATH)." }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git не найден в PATH." }

Say "Код: клон/обновление в $Dir"
if (Test-Path (Join-Path $Dir ".git")) { git -C $Dir pull --quiet } else { git clone $RepoUrl $Dir }

Say "config.ini"
@"
[rkeeper]
endpoint = $Endpoint
user     = $RkUser
pass     = $RkPass
admin_pw = $AdminPw
"@ | Set-Content -Encoding UTF8 (Join-Path $Dir "config.ini")

Say "Первая выгрузка меню из R_Keeper"
Push-Location $Dir; & $py "pull.py"; Pop-Location

$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Say "Служба витрины (Планировщик: TaynyMenu, автозапуск)"
$a1 = New-ScheduledTaskAction -Execute $py -Argument "serve.py" -WorkingDirectory $Dir
$t1 = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "TaynyMenu" -Action $a1 -Trigger $t1 -Settings $set `
  -RunLevel Highest -User "SYSTEM" -Force | Out-Null
Start-ScheduledTask -TaskName "TaynyMenu"

Say "Авто-обновление из git (TaynyMenuUpdate, каждые 10 мин)"
$a2 = New-ScheduledTaskAction -Execute (Join-Path $Dir "update.bat") -WorkingDirectory $Dir
$t2 = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration ([TimeSpan]::MaxValue)
Register-ScheduledTask -TaskName "TaynyMenuUpdate" -Action $a2 -Trigger $t2 -Settings $set `
  -RunLevel Highest -User "SYSTEM" -Force | Out-Null

Start-Sleep 2
Say "Готово. Проверьте: http://localhost:$Port/  и  http://localhost:$Port/admin"
Write-Host "Служба: (Get-ScheduledTask TaynyMenu).State ; логи serve — в окне задачи."
