' Ejecuta el Watcher de Salud y Rendimiento de EntrenoApp en segundo plano sin ventana
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir
WshShell.Run "python """ & strDir & "\sync_all_health_data.py"" --watch", 0, False
