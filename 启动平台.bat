@echo off
chcp 65001 > nul
title 智能水处理系统设计平台 v3.4

echo.
echo  =========================================
echo    智能水处理系统设计平台 v3.4
echo    http://localhost:5000
echo  =========================================
echo.

:: ---- Node.js 路径配置 ----
set "NODE_DIR=C:\Users\zzy\.workbuddy\binaries\node\versions\22.12.0.installing.10148.__extract_temp__\node-v22.12.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 验证 node 可用
"%NODE_DIR%\node.exe" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请联系管理员
    pause
    exit /b 1
)

:: ---- 项目目录 ----
cd /d "d:\水处理系统设计\2.0\projects"

:: ---- 检查端口是否已在运行 ----
netstat -ano | findstr ":5000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] 服务已在运行，直接打开浏览器...
    start "" "http://localhost:5000"
    goto :already_running
)

:: ---- 后台启动服务器 ----
echo [INFO] 正在后台启动服务器（端口 5000）...
start "水处理平台[后台服务]" /min cmd /c "cd /d d:\水处理系统设计\2.0\projects && set DEPLOY_RUN_PORT=5000 && set PORT=5000 && "%NODE_DIR%\pnpm.cmd" tsx watch src/server.ts"

:: ---- 等待服务就绪（最多60秒）----
set /a "waited=0"
echo [INFO] 等待服务就绪...

:wait_loop
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":5000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  [OK] 服务已就绪！正在打开浏览器...
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:5000"
    goto :success
)
set /a "waited+=2"
set /a "pct=waited*100/60"
echo [%pct%%%] 已等待 %waited% 秒...
if %waited% lss 60 goto :wait_loop

echo.
echo [WARN] 60秒内服务未就绪，尝试直接打开（可能需要再等几秒）
start "" "http://localhost:5000"

:success
echo.
echo  =========================================
echo   平台已启动: http://localhost:5000
echo   关闭"水处理平台[后台服务]"窗口停止服务
echo  =========================================
echo.
pause
exit /b 0

:already_running
echo.
echo  =========================================
echo   平台正在运行: http://localhost:5000
echo  =========================================
echo.
pause
exit /b 0
