param(
    [ValidateRange(1024,65535)][int]$Port = 9222,
    [string]$BrowserPath,
    [switch]$Visible,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$workspaceDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputDirectory = Join-Path $workspaceDirectory 'output\playwright'
$profileDirectory = Join-Path $outputDirectory 'chromium-cdp-profile'
$endpoint = "http://127.0.0.1:$Port"

if (-not $BrowserPath) {
    $preferred = Join-Path $env:LOCALAPPDATA 'ms-playwright\chromium-1228\chrome-win64\chrome.exe'
    if (Test-Path -LiteralPath $preferred) { $BrowserPath = $preferred }
    else {
        $cacheRoot = Join-Path $env:LOCALAPPDATA 'ms-playwright'
        if (Test-Path -LiteralPath $cacheRoot) {
            foreach ($installation in (Get-ChildItem -LiteralPath $cacheRoot -Directory -Filter 'chromium-*' |
                    Sort-Object { [int]($_.Name -replace '^chromium-','') } -Descending)) {
                $candidate = Join-Path $installation.FullName 'chrome-win64\chrome.exe'
                if (Test-Path -LiteralPath $candidate) { $BrowserPath = $candidate; break }
            }
        }
    }
    if (-not $BrowserPath) {
        $chrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
        if (Test-Path -LiteralPath $chrome) { $BrowserPath = $chrome }
    }
}
if (-not $BrowserPath -or -not (Test-Path -LiteralPath $BrowserPath)) {
    throw 'Chromium/Chrome executable not found. Supply -BrowserPath with its full path.'
}
$BrowserPath = [IO.Path]::GetFullPath($BrowserPath)
$browserArguments = @(
    "--remote-debugging-port=$Port",
    '--remote-debugging-address=127.0.0.1',
    ('--user-data-dir="' + $profileDirectory + '"'),
    '--no-first-run', '--no-default-browser-check', 'about:blank'
)
if (-not $Visible) { $browserArguments = @('--headless=new') + $browserArguments }
if ($DryRun) {
    [pscustomobject]@{Executable=$BrowserPath;Arguments=$browserArguments;Endpoint=$endpoint;
        Profile=$profileDirectory;Visible=[bool]$Visible} | ConvertTo-Json -Depth 3
    exit 0
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
try {
    $existing = Invoke-RestMethod -Uri "$endpoint/json/version" -TimeoutSec 2
} catch { $existing = $null }
if ($existing -and $existing.webSocketDebuggerUrl) {
    Write-Host "CDP already available: $endpoint ($($existing.Browser))" -ForegroundColor Green
    exit 0
}

Write-Host "Starting project Chromium. CDP: $endpoint"
Write-Host "Separate profile: $profileDirectory"
$stdoutPath = Join-Path $outputDirectory 'chromium-stdout.log'
$stderrPath = Join-Path $outputDirectory 'chromium-stderr.log'
$windowStyle = if ($Visible) { 'Normal' } else { 'Hidden' }
$browserProcess = Start-Process -FilePath $BrowserPath -ArgumentList $browserArguments -WindowStyle $windowStyle `
    -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
$deadline = [DateTime]::UtcNow.AddSeconds(15)
$version = $null
while ([DateTime]::UtcNow -lt $deadline) {
    try {
        $version = Invoke-RestMethod -Uri "$endpoint/json/version" -TimeoutSec 1
        if ($version.webSocketDebuggerUrl) { break }
    } catch {}
    $browserProcess.Refresh()
    if ($browserProcess.HasExited) {
        if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Tail 15 | Write-Host }
        throw 'Chromium exited before CDP became available. Run this script from a normal Windows terminal.'
    }
    Start-Sleep -Milliseconds 250
}
if (-not $version -or -not $version.webSocketDebuggerUrl) {
    throw "CDP did not start within 15 seconds. Check $stderrPath and whether port $Port is occupied."
}
[pscustomobject]@{Pid=$browserProcess.Id;Browser=$version.Browser;Endpoint=$endpoint;
    Profile=$profileDirectory;Executable=$BrowserPath;StartedAt=[DateTime]::UtcNow.ToString('o')} |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputDirectory 'chromium-session.json') -Encoding utf8
Write-Host "CDP available: $endpoint" -ForegroundColor Green
Write-Host 'Ready for Playwright. Keep Chromium running while the agent checks the site.'
Write-Host ('Check: node "' + (Join-Path $PSScriptRoot 'check-browser-access.cjs') + '"')
