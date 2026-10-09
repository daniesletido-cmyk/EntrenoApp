$sh = New-Object -ComObject WScript.Shell
$lnkPath = "C:\Users\danie\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Aplicaciones de Chrome\EntrenoApp.lnk"
if (Test-Path $lnkPath) {
    $s = $sh.CreateShortcut($lnkPath)
    Write-Output ("TargetPath: " + $s.TargetPath)
    Write-Output ("Arguments: " + $s.Arguments)
    Write-Output ("IconLocation: " + $s.IconLocation)
    $s.IconLocation = "C:\Users\danie\AppData\Local\Google\Chrome\User Data\Default\Web Applications\_crx_pdhgnnimkdgbffhcmogdldikeolaeedj\EntrenoApp.ico,0"
    $s.Save()
    Write-Output "Start Menu Shortcut updated!"
}

$crxLnk = "C:\Users\danie\AppData\Local\Google\Chrome\User Data\Default\Web Applications\_crx_pdhgnnimkdgbffhcmogdldikeolaeedj\EntrenoApp.lnk"
if (Test-Path $crxLnk) {
    $s2 = $sh.CreateShortcut($crxLnk)
    $s2.IconLocation = "C:\Users\danie\AppData\Local\Google\Chrome\User Data\Default\Web Applications\_crx_pdhgnnimkdgbffhcmogdldikeolaeedj\EntrenoApp.ico,0"
    $s2.Save()
    Write-Output "CRX Shortcut updated!"
}
