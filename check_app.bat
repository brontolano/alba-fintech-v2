@echo off
timeout /t 5 /nobreak >nul
curl -s http://localhost:3000/login > C:\temp\login_page.html 2>nul
echo HTTP Status: >> C:\temp\result.txt
curl -s -o /dev/null -w "%%{http_code}\n" http://localhost:3000/login >> C:\temp\result.txt 2>nul
echo Login page size:
wc -c C:\temp\login_page.html >> C:\temp\result.txt 2>nul
type C:\temp\login_page.html | findstr -i "login\|form\|password\|email" >> C:\temp\result.txt 2>nul
