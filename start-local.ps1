param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
    Write-Host "SyntheCore v23.1: http://127.0.0.1:$Port/" -ForegroundColor Green
    Write-Host "Папка: $root"
    Write-Host 'Остановить: Ctrl+C'
    Start-Process "http://127.0.0.1:$Port/"
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $line = $reader.ReadLine()
            if (-not $line) { continue }
            while ($true) { $header = $reader.ReadLine(); if ($null -eq $header -or $header.Length -eq 0) { break } }
            $parts = $line.Split(' ')
            $requestPath = if ($parts.Count -ge 2) { $parts[1].Split('?')[0] } else { '/' }
            $requestPath = [Uri]::UnescapeDataString($requestPath)
            if ($requestPath -eq '/') { $requestPath = '/index.html' }
            $relative = $requestPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
            $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
            $allowed = $full.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
            $exists = $allowed -and [System.IO.File]::Exists($full)
            if ($exists) {
                $content = [System.IO.File]::ReadAllBytes($full)
                $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
                $type = switch ($ext) {
                    '.html' {'text/html; charset=utf-8'}
                    '.css' {'text/css; charset=utf-8'}
                    '.js' {'application/javascript; charset=utf-8'}
                    '.webp' {'image/webp'}
                    '.png' {'image/png'}
                    '.svg' {'image/svg+xml'}
                    '.json' {'application/json; charset=utf-8'}
                    '.md' {'text/plain; charset=utf-8'}
                    default {'application/octet-stream'}
                }
                $status = '200 OK'
            } else {
                $content = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $type = 'text/plain; charset=utf-8'
                $status = '404 Not Found'
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($content.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n"
            $hb = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($hb,0,$hb.Length)
            if ($parts[0] -ne 'HEAD') { $stream.Write($content,0,$content.Length) }
            $stream.Flush()
        } catch { Write-Warning "Ошибка запроса: $_" }
        finally { $client.Dispose() }
    }
}
finally { $listener.Stop() }
