@echo off
REM Windows 版构建脚本
REM Cloudflare Pages 构建命令: scripts\build-inject.bat

echo === 构建时环境变量注入 ===

if "%API_BASE%"=="" set API_BASE=/api/v1
if "%APP_NAME%"=="" set APP_NAME=校园失物招领

echo API_BASE=%API_BASE%
echo APP_NAME=%APP_NAME%

REM 生成 config.js
echo window.__APP_CONFIG__ = {> config.js
echo   API_BASE: "%API_BASE%",>> config.js
echo   APP_NAME: "%APP_NAME%",>> config.js
echo   RECOGNITION_PROVIDER: "%RECOGNITION_PROVIDER%",>> config.js
echo   NOTIFICATION_PROVIDER: "%NOTIFICATION_PROVIDER%">> config.js
echo };>> config.js

echo ✓ config.js 已生成

REM 替换 index.html 中的占位符
powershell -Command "(Get-Content index.html) -replace '__API_BASE__', '%API_BASE%' -replace '__APP_NAME__', '%APP_NAME%' | Set-Content index.html"
echo ✓ index.html 占位符已替换

echo === 构建完成 ===