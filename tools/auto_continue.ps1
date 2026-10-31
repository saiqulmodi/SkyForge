# SkyForge auto-continue: resumes the PROGRESS.md task after a Claude usage limit resets.
# Run by scheduled task SkyForge_AutoContinue every 30 min. Disables itself when STATUS: DONE.
$proj = 'C:\Users\saiqu\Projects\skyforge'
$progress = Join-Path $proj 'PROGRESS.md'
$lock = Join-Path $proj 'tools\auto_continue.lock'
$log = Join-Path $proj 'tools\auto_continue.log'

function Log($m) { Add-Content -Path $log -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $m) }

$text = Get-Content $progress -Raw
if ($text -match 'STATUS: DONE') {
  Log 'STATUS: DONE - disabling task'
  Disable-ScheduledTask -TaskName 'SkyForge_AutoContinue' | Out-Null
  exit 0
}
# Another run still working (lock younger than 3 h)
if ((Test-Path $lock) -and ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalHours -lt 3) { Log 'skip: lock held'; exit 0 }
# An interactive session touched PROGRESS.md in the last 25 min - leave it alone
if (((Get-Date) - (Get-Item $progress).LastWriteTime).TotalMinutes -lt 25) { Log 'skip: progress recently updated'; exit 0 }

Set-Content -Path $lock -Value $PID
Log 'starting claude'
Set-Location $proj
$prompt = 'Read PROGRESS.md in this folder and continue the SkyForge task from the first unticked step. Follow the rules in it. After each finished step tick it and add a Log line in PROGRESS.md. When everything is done and verified, run the git commit it names and set STATUS: DONE.'
& 'C:\Users\saiqu\.local\bin\claude.exe' -p $prompt --permission-mode acceptEdits --allowedTools 'Read,Edit,Write,Glob,Grep,Bash(git *),Bash(node *),Bash(ls *),Bash(cat *),Bash(grep *)' *>> $log
Log ("claude exited with code {0}" -f $LASTEXITCODE)
Remove-Item $lock -Force
