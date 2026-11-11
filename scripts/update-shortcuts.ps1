$sh = New-Object -ComObject WScript.Shell

# Prefer Chrome PWA cached EntrenoApp.ico if present (gives Windows Taskbar a fresh path so Explorer drops stale cache)
$chromeIco = Get-ChildItem "$env:LOCALAPPDATA\Google\Chrome\User Data" -Recurse -Filter "EntrenoApp.ico" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
$fallbackIco = "C:\Users\danie\Desktop\Aplicaciones\EntrenoApp\build\icon.ico"
$targetIco = if ($chromeIco) { $chromeIco } else { $fallbackIco }

$searchDirs = @(
    "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar",
    "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\StartMenu",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:USERPROFILE\Desktop",
    "$env:LOCALAPPDATA\Google\Chrome\User Data"
)

$updated = 0
foreach ($dir in $searchDirs) {
    if (-not (Test-Path $dir)) { continue }
    Get-ChildItem $dir -Recurse -Filter "*Entreno*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
        $s = $sh.CreateShortcut($_.FullName)
        $s.IconLocation = "$targetIco,0"
        $s.Save()
        # Touch timestamp so Explorer detects modification
        (Get-Item $_.FullName).LastWriteTime = Get-Date
        Write-Output "Updated shortcut: $($_.FullName) -> $targetIco,0"
        $updated++
    }
}

# Notify Windows Shell so taskbar/desktop reload shortcut icons
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShellIconRefresh {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
[ShellIconRefresh]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)

if (Get-Command ie4uinit.exe -ErrorAction SilentlyContinue) {
    ie4uinit.exe -ClearIconCache 2>$null
    ie4uinit.exe -show 2>$null
}

Write-Output "Shortcut refresh complete ($updated updated)."
