# สร้างไอคอน PNG ของแอป (รูปดัมเบลบนพื้นส้ม)
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Make-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(232, 73, 42))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $s = $size / 100.0
  # แกน
  $g.FillRectangle($white, [float](28 * $s), [float](46 * $s), [float](44 * $s), [float](8 * $s))
  # แผ่นน้ำหนัก ซ้าย/ขวา
  foreach ($x in @(18, 72)) { $g.FillRectangle($white, [float]($x * $s), [float](30 * $s), [float](10 * $s), [float](40 * $s)) }
  foreach ($x in @(10, 82)) { $g.FillRectangle($white, [float]($x * $s), [float](38 * $s), [float](8 * $s), [float](24 * $s)) }
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Make-Icon 192 'icon-192.png'
Make-Icon 512 'icon-512.png'
Make-Icon 180 'apple-touch-icon.png'
