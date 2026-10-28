@echo off
rem Lance la demo "Dossier de travail" puis ouvre le navigateur.
rem Pour arreter : fermer cette fenetre.
title Dossier de travail - demo (ne pas fermer)
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\nodejs;%PATH%"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Il doit etre installe dans %LOCALAPPDATA%\nodejs
  pause
  exit /b 1
)

if not exist node_modules (
  echo Premiere utilisation : installation des composants, merci de patienter...
  call npm install
)

echo Demarrage de l'application... le navigateur va s'ouvrir sur http://localhost:3000
start "" cmd /c "timeout /t 12 /nobreak >nul & start http://localhost:3000"
call npm run dev
