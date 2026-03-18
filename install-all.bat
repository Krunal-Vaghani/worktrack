@echo off
echo Installing all packages manually...
echo.

echo [Root]
npm install --legacy-peer-deps --ignore-scripts
echo.

echo [Renderer]
cd renderer
npm install --legacy-peer-deps
cd ..
echo.

echo [Admin Dashboard]
cd admin-dashboard
npm install --legacy-peer-deps
cd ..
echo.

echo [Admin Server]
cd admin-server
npm install --legacy-peer-deps
cd ..

echo.
echo Done. Now run: npm run dist:win
pause
