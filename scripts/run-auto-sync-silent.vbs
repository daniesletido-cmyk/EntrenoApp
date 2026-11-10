Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\danie\Desktop\Aplicaciones\EntrenoApp"
WshShell.Run "node scripts\auto-device-sync.mjs --watch", 0, False
