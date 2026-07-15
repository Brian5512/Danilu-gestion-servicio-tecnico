@echo off
set "ROOT=%~dp0"
set "TARGET=%ROOT%Danilu - Sistema de Boletas.bat"
set "ICON=%ROOT%static\assets\danilu-logo.ico"
set "SHORTCUT=%USERPROFILE%\Desktop\Danilu - Sistema de Boletas.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('%SHORTCUT%'); $shortcut.TargetPath = '%TARGET%'; $shortcut.WorkingDirectory = '%ROOT%'; $shortcut.IconLocation = '%ICON%'; $shortcut.Description = 'Abrir sistema local de boletas Danilu'; $shortcut.Save()"

echo Acceso directo creado en el Escritorio.
pause
