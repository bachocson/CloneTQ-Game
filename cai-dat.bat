@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Cài đặt công cụ lần đầu (cần Node.js: https://nodejs.org)...
call npm install
echo.
echo Xong. Từ giờ dùng choi-thu.bat để chơi thử, cap-nhat-du-lieu.bat sau khi sửa Excel.
pause
