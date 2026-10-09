# Imports the North Foundry (Demo) seed into Convex. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\demo-seed\import.ps1
# Add -Prod to target the production deployment instead of the one `npx convex dev` uses.
param([switch]$Prod)
$dir = Join-Path $PSScriptRoot "out"
$order = @("users","members","channels","conversations","messages","reactions","sprints","tasks","taskComments",
           "meetings","meetingTranscripts","aiSummaryLog","notes","docs","dbConfigs","dbRows","dbCounts",
           "auditLog","notifications","savedMessages","pins")
foreach ($t in $order) {
  $f = Join-Path $dir "$t.jsonl"
  if (-not (Test-Path $f)) { Write-Host "skip $t (no file)"; continue }
  Write-Host "importing $t ..."
  if ($Prod) { npx convex import --prod --table $t --append $f } else { npx convex import --table $t --append $f }
  if ($LASTEXITCODE -ne 0) { Write-Host "FAILED on $t - stopping. Nothing after this table was imported."; exit 1 }
}
Write-Host "Done."
