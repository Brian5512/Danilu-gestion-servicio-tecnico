@echo off
setlocal
title Crear acceso directo Danilu

set "ROOT=%~dp0"
set "TARGET=%ROOT%Danilu - Sistema de Boletas.bat"
set "ICON=%ROOT%static\assets\danilu-logo.ico"

echo.
echo Creando acceso directo de Danilu...
echo.

if not exist "%TARGET%" (
  echo No se encontro el archivo:
  echo %TARGET%
  echo.
  pause
  exit /b 1
)

if not exist "%ICON%" (
  echo No se encontro el icono:
  echo %ICON%
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $root = $env:ROOT; $target = $env:TARGET; $icon = $env:ICON; $desktop = [Environment]::GetFolderPath('Desktop'); $paths = @((Join-Path $root 'Danilu - Sistema de Boletas.lnk'), (Join-Path $desktop 'Danilu - Sistema de Boletas.lnk')); $shell = New-Object -ComObject WScript.Shell; foreach ($path in $paths) { $shortcut = $shell.CreateShortcut($path); $shortcut.TargetPath = $target; $shortcut.WorkingDirectory = $root; $shortcut.IconLocation = $icon; $shortcut.Description = 'Abrir sistema local de boletas Danilu'; $shortcut.Save() }; Write-Host 'Acceso creado en:'; $paths | ForEach-Object { Write-Host $_ }"

if errorlevel 1 (
  echo.
  echo No se pudo crear el acceso directo.
  echo Ejecuta este archivo como administrador o abre directamente:
  echo Danilu - Sistema de Boletas.bat
  echo.
  pause
  exit /b 1
)

echo.
echo Listo. Tambien puedes abrir la aplicacion con:
echo Danilu - Sistema de Boletas.bat
echo.
pause
