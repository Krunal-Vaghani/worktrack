@echo off
echo.
echo  WorkTrack Setup
echo  ===============
echo.

node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)
echo Node.js OK

npm --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found.
    pause & exit /b 1
)
echo npm OK
echo.

echo Step 1 of 4: Root packages...
npm install --legacy-peer-deps --ignore-scripts
IF %ERRORLEVEL% NEQ 0 ( echo FAILED step 1 & pause & exit /b 1 )
echo Step 1 done.
echo.

echo Step 2 of 4: Renderer packages...
cd renderer
npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 ( echo FAILED step 2 & cd .. & pause & exit /b 1 )
cd ..
echo Step 2 done.
echo.

echo Step 3 of 4: Admin dashboard packages...
cd admin-dashboard
npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 ( echo FAILED step 3 & cd .. & pause & exit /b 1 )
cd ..
echo Step 3 done.
echo.

echo Step 4 of 4: Admin server packages...
cd admin-server
npm install --legacy-peer-deps
cd ..
echo Step 4 done.
echo.

echo ================================
echo  All packages installed!
echo  Now run:  npm run dist:win
echo ================================
echo.
pause
