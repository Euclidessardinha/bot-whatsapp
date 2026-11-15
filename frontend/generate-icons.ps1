
# =========================================================
# BOT WHATSAPP SAAS
# GERADOR DE ÍCONES ANDROID
# =========================================================

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$logoPath = Join-Path $projectRoot "public\logo.png"
$resPath = Join-Path $projectRoot "android\app\src\main\res"

if (-not (Test-Path $logoPath)) {
    Write-Host ""
    Write-Host "ERRO: logo.png nao encontrado:" -ForegroundColor Red
    Write-Host $logoPath
    Write-Host ""
    exit 1
}

if (-not (Test-Path $resPath)) {
    Write-Host ""
    Write-Host "ERRO: pasta Android nao encontrada:" -ForegroundColor Red
    Write-Host $resPath
    Write-Host ""
    exit 1
}

# =========================================================
# BACKUP
# =========================================================

$backupRoot = Join-Path $resPath "_backup_icons"

if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

Write-Host ""
Write-Host "Criando backup dos icones atuais..." -ForegroundColor Cyan

$folders = @(
    "mipmap-mdpi",
    "mipmap-hdpi",
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi"
)

foreach ($folder in $folders) {

    $sourceFolder = Join-Path $resPath $folder
    $backupFolder = Join-Path $backupRoot $folder

    if (-not (Test-Path $backupFolder)) {
        New-Item -ItemType Directory -Path $backupFolder | Out-Null
    }

    if (Test-Path $sourceFolder) {

        Get-ChildItem $sourceFolder -Filter "ic_launcher*.png" -ErrorAction SilentlyContinue |
            ForEach-Object {

                Copy-Item `
                    $_.FullName `
                    (Join-Path $backupFolder $_.Name) `
                    -Force
            }
    }
}

Write-Host "Backup concluido." -ForegroundColor Green

# =========================================================
# FUNCAO PARA GERAR PNG
# =========================================================

function New-Icon {

    param(
        [string]$OutputPath,
        [int]$Size,
        [double]$LogoScale = 0.78
    )

    $source = [System.Drawing.Image]::FromFile($logoPath)

    $bitmap = New-Object System.Drawing.Bitmap(
        $Size,
        $Size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    $graphics.Clear(
        [System.Drawing.Color]::Transparent
    )

    $graphics.InterpolationMode =
        [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $graphics.SmoothingMode =
        [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $graphics.PixelOffsetMode =
        [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.CompositingQuality =
        [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Mantem a proporcao original 1535x1024
    $ratio = [Math]::Min(
        ($Size * $LogoScale) / $source.Width,
        ($Size * $LogoScale) / $source.Height
    )

    $newWidth = [int]($source.Width * $ratio)
    $newHeight = [int]($source.Height * $ratio)

    $x = [int](($Size - $newWidth) / 2)
    $y = [int](($Size - $newHeight) / 2)

    $graphics.DrawImage(
        $source,
        $x,
        $y,
        $newWidth,
        $newHeight
    )

    $directory = Split-Path $OutputPath -Parent

    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $bitmap.Save(
        $OutputPath,
        [System.Drawing.Imaging.ImageFormat]::Png
    )

    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
}

# =========================================================
# ICONES NORMAIS
# =========================================================

$normalSizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

Write-Host ""
Write-Host "Gerando ic_launcher.png..." -ForegroundColor Cyan

foreach ($item in $normalSizes.GetEnumerator()) {

    $folder = Join-Path $resPath $item.Key

    New-Icon `
        -OutputPath (Join-Path $folder "ic_launcher.png") `
        -Size $item.Value

    Write-Host "  $($item.Key): $($item.Value)x$($item.Value)"
}

# =========================================================
# ICONES REDONDOS
# =========================================================

Write-Host ""
Write-Host "Gerando ic_launcher_round.png..." -ForegroundColor Cyan

foreach ($item in $normalSizes.GetEnumerator()) {

    $folder = Join-Path $resPath $item.Key

    New-Icon `
        -OutputPath (Join-Path $folder "ic_launcher_round.png") `
        -Size $item.Value

    Write-Host "  $($item.Key): $($item.Value)x$($item.Value)"
}

# =========================================================
# FOREGROUND PARA ADAPTIVE ICON
# =========================================================

$foregroundSizes = @{
    "mipmap-mdpi"    = 108
    "mipmap-hdpi"    = 162
    "mipmap-xhdpi"   = 216
    "mipmap-xxhdpi"  = 324
    "mipmap-xxxhdpi" = 432
}

Write-Host ""
Write-Host "Gerando ic_launcher_foreground.png..." -ForegroundColor Cyan

foreach ($item in $foregroundSizes.GetEnumerator()) {

    $folder = Join-Path $resPath $item.Key

    New-Icon `
        -OutputPath (Join-Path $folder "ic_launcher_foreground.png") `
        -Size $item.Value `
        -LogoScale 0.70

    Write-Host "  $($item.Key): $($item.Value)x$($item.Value)"
}

# =========================================================
# RESULTADO
# =========================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " ICONES GERADOS COM SUCESSO" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Logo usado:"
Write-Host $logoPath
Write-Host ""
Write-Host "Backup dos icones antigos:"
Write-Host $backupRoot
Write-Host ""
Write-Host "Agora os icones Android usam o logo.png."
Write-Host ""
