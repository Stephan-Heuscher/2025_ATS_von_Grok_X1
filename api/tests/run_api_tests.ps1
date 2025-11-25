<#
Manual API test script for the Issues API.

Usage:
  - Open PowerShell
  - Set $baseUrl to your API base (SWA public url or http://localhost:7071/api)
  - Run the script: .\run_api_tests.ps1

This will create an issue, update it (PUT / upsert), fetch, and delete it.
#>

$baseUrl = $env:API_BASEURL -or "https://agreeable-stone-0a4c73503.3.azurestaticapps.net/api"
Write-Host "Testing API at $baseUrl"

$id = [string]::Concat((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'), (Get-Random -Maximum 9999))

Write-Host "Creating issue id=$id"
$create = Invoke-RestMethod -Uri ("$baseUrl/issues") -Method Post -ContentType 'application/json' -Body (@{ id=$id; title='PS Test'; description='Created by run_api_tests.ps1'} | ConvertTo-Json)
Write-Host "Create result:`n" (ConvertTo-Json $create -Depth 5)

Write-Host "Updating issue (PUT) to status=closed"
$update = Invoke-RestMethod -Uri ("$baseUrl/issues/$id") -Method Put -ContentType 'application/json' -Body (@{ title='PS Test (updated)'; description='Updated via PUT'; status='closed' } | ConvertTo-Json)
Write-Host "Update result:`n" (ConvertTo-Json $update -Depth 5)

Write-Host "Fetching issue by id"
$get = Invoke-RestMethod -Uri ("$baseUrl/issues/$id") -Method Get
Write-Host "GET result:`n" (ConvertTo-Json $get -Depth 5)

Write-Host "Deleting issue"
$del = Invoke-WebRequest -Uri ("$baseUrl/issues/$id") -Method Delete -UseBasicParsing -ErrorAction SilentlyContinue
Write-Host "Delete status: $($del.StatusCode)"

Write-Host "Done"
