@echo off
echo Iniciando Copiloto Farma (dev)...

:: Banco de dados
docker-compose up db -d

:: Backend (porta 8001)
start "Backend" cmd /k "cd /d %~dp0 && uvicorn backend.main:app --reload --port 8001"

:: Widget dev server
start "Widget" cmd /k "cd /d %~dp0widget && npm run dev"

:: Aguarda o widget subir e abre o Electron
timeout /t 5 /nobreak >nul
start "Electron" cmd /k "cd /d %~dp0electron && npm start"
