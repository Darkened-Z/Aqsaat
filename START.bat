@echo off
title Aqsat Manager - WhatsApp Bot
echo.
echo  ===================================
echo    Aqsat Manager + WhatsApp Bot
echo    اقساط مینیجر + واٹس ایپ بوٹ
echo  ===================================
echo.
echo  Starting server...
echo  سرور شروع ہو رہا ہے...
echo.
echo  After starting, open in browser:
echo  http://localhost:3000
echo.
echo  DO NOT CLOSE THIS WINDOW
echo  یہ ونڈو بند نہ کریں
echo  ===================================
echo.
cd /d "%~dp0"
npx next start
pause
