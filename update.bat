@echo off
rem Авто-обновление витрины из git. Запускается Планировщиком (TaynyMenuUpdate) каждые ~10 мин.
cd /d "%~dp0"
for /f %%i in ('git rev-parse HEAD') do set OLD=%%i
git pull --quiet
for /f %%i in ('git rev-parse HEAD') do set NEW=%%i
if not "%OLD%"=="%NEW%" (
  echo [%date% %time%] code updated %OLD% -^> %NEW%, restart service
  schtasks /End /TN "TaynyMenu" >nul 2>&1
  schtasks /Run /TN "TaynyMenu" >nul 2>&1
)
