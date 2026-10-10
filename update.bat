@echo off
rem Авто-обновление витрины из git. Запускать Планировщиком задач (напр. раз в 10 мин).
cd /d "%~dp0"
for /f %%i in ('git rev-parse HEAD') do set OLD=%%i
git pull --quiet
for /f %%i in ('git rev-parse HEAD') do set NEW=%%i
if not "%OLD%"=="%NEW%" (
  echo [%date% %time%] updated %OLD% -^> %NEW%, restart service
  nssm restart tayny-menu
)
