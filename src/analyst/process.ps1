$directoryLine = Get-Content ".env" | Where-Object { $_ -match "^DIRECTORY\s*=" }
$TargetDir = $directoryLine -replace "^DIRECTORY\s*=\s*", "" -replace "/", "\" -replace '"', ""


# Get all directories inside the target directory
$dirs = Get-ChildItem -Path $TargetDir -Directory |  Select-Object -ExpandProperty Name

# Split directories into groups of five
$groups = @()
for ($i = 0; $i -lt $dirs.Count; $i += 5) {
    $groups += , ($dirs[$i..([math]::Min($i + 4, $dirs.Count - 1))])
}


# Launch a new terminal tab for each group and run the Python script
foreach ($group in $groups) {
    $dirString = $group -join ","
    Start-Process powershell -ArgumentList "-NoExit", ".venv\python.exe src\analyst\main.py `"$dirString`""
}