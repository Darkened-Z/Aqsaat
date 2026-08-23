@echo off
echo Sending Monday reminders...
curl -s -X POST http://localhost:3000/api/whatsapp-remind -H "Content-Type: application/json" -d "{\"targets\":\"auto\"}"
echo.
echo Done.
