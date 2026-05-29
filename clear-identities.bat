@echo off
cd /d "%~dp0"
echo.
echo Blue Room — clear saved identity gallery
echo.
echo Gallery data lives in your browser. This opens the clear page
echo on common local URLs (use whichever tab loads).
echo.
start "" "http://127.0.0.1:5500/clear-identities.html"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/clear-identities.html"
echo.
echo If neither tab opened your app, visit manually:
echo   YOUR_APP_URL/clear-identities.html
echo.
echo Example: http://127.0.0.1:5500/clear-identities.html
echo.
pause
