# ============================================================
# videos.json Data Cleaning Script
# Fixes biological category and geographic region errors
# ============================================================
param(
    [string]$FilePath = "d:\Documents\!UTAR\FYP\animal-verse\data\videos.json"
)

$ErrorActionPreference = "Stop"

# Read the JSON
$content = Get-Content $FilePath -Raw
$origContent = $content

Write-Output "=== Fixing Biological Categories ==="

# ── Category corrections (wrong biological class) ──
$categoryFixes = @{
    # Amphibians currently mislabeled as mammals
    'axolotl'   = @{ from = 'mammals';  to = 'amphibians' }
    'caecilian' = @{ from = 'mammals';  to = 'amphibians' }
    'hellbender' = @{ from = 'mammals'; to = 'amphibians' }
    # Invertebrates / others currently mislabeled as mammals
    'butterfly' = @{ from = 'mammals';  to = 'birds' }
    'owl'       = @{ from = 'mammals';  to = 'birds' }
    # Reptiles currently mislabeled as mammals
    'alligator'    = @{ from = 'mammals'; to = 'reptiles' }
    'gila-monster' = @{ from = 'mammals'; to = 'reptiles' }
    'king-cobra'   = @{ from = 'mammals'; to = 'reptiles' }
    'tuatara'      = @{ from = 'mammals'; to = 'reptiles' }
    # Coral snake currently mislabeled as aquatic
    'coral-snake'  = @{ from = 'aquatic'; to = 'reptiles' }
}

$fixCount = 0
foreach ($animal in $categoryFixes.Keys) {
    $from = $categoryFixes[$animal].from
    $to = $categoryFixes[$animal].to
    # Match: "id": "video-{animal}-{NNN}", followed by any content, then "category": "{from}"
    $pattern = '(?s)("id":\s*"video-' + $animal + '-\d{3}"[^{]*?)"category":\s*"' + $from + '"'
    $replacement = '$1"category": "' + $to + '"'
    $newContent = $content -replace $pattern, $replacement
    if ($newContent -ne $content) {
        $m = [regex]::Matches($content, $pattern).Count
        $fixCount += $m
        Write-Output "  ${animal}: ${from} -> ${to} (${m} entries)"
        $content = $newContent
    } else {
        Write-Output "  ${animal}: no matches found"
    }
}

Write-Output "Category fixes applied: $fixCount"

Write-Output "`n=== Fixing Geographic Regions ==="

# ── Region corrections ──
$regionFixes = @{
    # Israel is in Asia, not Europe/Africa/Australia
    'badger'    = @{ from = 'Europe';    to = 'Asia' }
    'eagle'     = @{ from = 'Europe';    to = 'Asia' }
    'wild-boar' = @{ from = 'Europe';    to = 'Asia' }
    'wolf'      = @{ from = 'Europe';    to = 'Asia' }
    'dingo'     = @{ from = 'Australia'; to = 'Asia' }
    'flamingo'  = @{ from = 'Africa';    to = 'Asia' }
    # Belgium is in Europe, not Asia
    'peacock'   = @{ from = 'Asia';         to = 'Europe' }
    # Germany is in Europe, not North America
    'elk'       = @{ from = 'North America'; to = 'Europe' }
    # Canada is in North America, not Antarctica
    'orca'      = @{ from = 'Antarctica';    to = 'North America' }
    # Honduras is in Central/North America, not South America
    'macaw'         = @{ from = 'South America'; to = 'North America' }
    'vampire-bat'   = @{ from = 'South America'; to = 'North America' }
    # South Africa is in Africa, not Antarctica
    'arctic-tern'   = @{ from = 'Antarctica'; to = 'Africa' }
    # Turkey is in Europe/Asia, not North America
    'grizzly-bear'  = @{ from = 'North America'; to = 'Europe' }
    # Reunion is in Africa, not Ocean
    'chameleon'     = @{ from = 'Ocean';   to = 'Africa' }
    # Piranha at (0,0) Unknown Location should be South America (already correct)
}

$regionFixCount = 0
foreach ($animal in $regionFixes.Keys) {
    $from = $regionFixes[$animal].from
    $to = $regionFixes[$animal].to
    # Match: "id": "video-{animal}-{NNN}", followed by any content, then "region": "{from}"
    $pattern = '(?s)("id":\s*"video-' + $animal + '-\d{3}"[\s\S]*?"region":\s*")' + $from + '"'
    $replacement = '$1' + $to + '"'
    $newContent = $content -replace $pattern, $replacement
    if ($newContent -ne $content) {
        $m = [regex]::Matches($content, $pattern).Count
        $regionFixCount += $m
        Write-Output "  ${animal}: ${from} -> ${to} (${m} entries)"
        $content = $newContent
    } else {
        Write-Output "  ${animal}: no matches found"
    }
}

Write-Output "Region fixes applied: $regionFixCount"

# ── Fix platypus location name (contains raw observer notes) ──
Write-Output "`n=== Fixing Location Names ==="
$platypusPattern = '(?s)("id":\s*"video-platypus-\d{3}"[\s\S]*?"name":\s*")[^"]*("[\s\S]*?"region":\s*")[^"]*(")'
$platypusReplacement = '$1Australia$2Australia$3'
$content = $content -replace $platypusPattern, $platypusReplacement
Write-Output "  platypus: location name cleaned"

# ── Fix iguana-001 video URL pointing to -2 file ──
Write-Output "`n=== Fixing Video URL Anomalies ==="
$content = $content -replace '(?s)("id":\s*"video-iguana-001"[\s\S]*?"videoUrl":\s*")[^"]*?iguana-video-2\.', '$1iguana-video-1.'
Write-Output "  iguana-001: videoUrl iguana-video-2 -> iguana-video-1"

$content = $content -replace '(?s)("id":\s*"video-red-eyed-tree-frog-001"[\s\S]*?"videoUrl":\s*")[^"]*?red-eyed-tree-frog-video-2\.', '$1red-eyed-tree-frog-video-1.'
Write-Output "  red-eyed-tree-frog-001: videoUrl video-2 -> video-1"

# ── Save changes ──
if ($content -ne $origContent) {
    $totalChanges = [regex]::Matches($origContent, '"category"') + [regex]::Matches($content, '"category"')
    $origSize = $origContent.Length
    Set-Content -Path $FilePath -Value $content -NoNewline -Encoding utf8
    Write-Output "`n✅ File saved: $FilePath"
    Write-Output "   Total category fixes: $fixCount"
    Write-Output "   Total region fixes: $regionFixCount"
} else {
    Write-Output "`n⚠️  No changes were made."
}

Write-Output "`nDone!"
