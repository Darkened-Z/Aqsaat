@echo off
cd /d "%~dp0"
for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do if "%%a"=="CRON_SECRET" set "CRON_SECRET=%%b"
echo Sending Monday reminders...
curl -s -X POST http://localhost:3000/api/whatsapp-remind -H "Content-Type: application/json" -H "x-cron-secret: %CRON_SECRET%" -d "{\"targets\":\"auto\"}"
echo.
echo Done.
