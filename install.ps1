# Wires this repo's canonical skills (.agents/skills/) into whatever coding
# agent(s) are set up for this project.
#
# Codex CLI and Gemini CLI read .agents/skills/ natively -- nothing to do for
# them. Claude Code looks in .claude/skills/ instead, so this creates a
# directory junction per skill there, pointing back at the canonical copy.
# Junctions don't require admin rights or Windows Developer Mode (unlike
# symlinks), and because it's a junction, editing a SKILL.md under
# .agents/skills/ takes effect for every agent immediately -- no reinstall
# needed when the harness itself changes.

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path ".agents/skills")) {
    Write-Error ".agents/skills not found -- run this from the harness-skills repo root"
    exit 1
}

New-Item -ItemType Directory -Force -Path ".claude/skills" | Out-Null

function Test-HarnessJunction($Target, $Source) {
    $item = Get-Item -LiteralPath $Target -Force -ErrorAction SilentlyContinue
    if ($null -eq $item -or -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        return $false
    }

    $linkTarget = @($item.Target)[0]
    if ([string]::IsNullOrWhiteSpace($linkTarget)) {
        return $false
    }
    $targetPath = [IO.Path]::GetFullPath($Target)
    $resolvedLink = if ([IO.Path]::IsPathRooted($linkTarget)) {
        [IO.Path]::GetFullPath($linkTarget)
    } else {
        [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $targetPath) $linkTarget))
    }
    return $resolvedLink.TrimEnd('\\') -ieq ([IO.Path]::GetFullPath($Source).TrimEnd('\\'))
}

$skills = Get-ChildItem -Directory ".agents/skills"
$conflicts = @()
foreach ($skill in $skills) {
    $target = Join-Path ".claude/skills" $skill.Name
    if ((Test-Path -LiteralPath $target) -and -not (Test-HarnessJunction $target $skill.FullName)) {
        $conflicts += $target
    }
}
if ($conflicts.Count -gt 0 -and -not $Force) {
    $conflicts | ForEach-Object { Write-Error "refusing to replace non-harness target: $_ (rerun with -Force to replace it)" }
    exit 1
}

foreach ($skill in $skills) {
    $name = $skill.Name
    $target = ".claude/skills/$name"
    if (Test-HarnessJunction $target $skill.FullName) {
        Write-Output "already linked $target -> $($skill.FullName)"
        continue
    }
    if (Test-Path -LiteralPath $target) {
        Remove-Item -Recurse -Force $target -Confirm:$false
    }
    New-Item -ItemType Junction -Path $target -Target $skill.FullName | Out-Null
    Write-Output "linked $target -> $($skill.FullName)"
}

& node .agents/scripts/generate-claude-scout.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output ""
Write-Output "Done. Codex CLI and Gemini CLI already read .agents/skills/ directly -- no action needed for them."
Write-Output "Claude Code hook example (optional): merge hooks/claude-code/settings.snippet.json into .claude/settings.json"
