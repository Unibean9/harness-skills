#!/usr/bin/env pwsh
<#
Installs the student harness kit into a target project. Selects one or more
runtimes via switch flags (-Claude -Cursor -Codex -Anti -Copilot);
flags are additive, and no flags passed defaults to -Claude only (unchanged
prior behavior).

-Claude copies the 3 flat source folders (agents/ hooks/ skills/) into
<TargetPath>/.claude/{agents,hooks,skills}, and copies this repo's
.hs.json to <TargetPath>/.hs.json (skipped if the target already
has one) - exactly as before this script gained other runtimes.

Every other selected runtime's content is GENERATED, not copied from a
static mirror: agents/, skills/, and hooks/ stay the single source of
truth, and install/lib/generate-runtime.mjs maps them into that runtime's
own shape (see README.md) into a scratch directory, which is
then copied into <TargetPath>/ the same safe way -Claude already was.
hooks/*.mjs are additionally copied into that runtime's own
`<dot-folder>/kit-hooks/` subfolder - never into a single shared folder.

This kit does not ship slash-commands for any runtime: every runtime
invokes a skill directly by matching the task to its SKILL.md description,
the same way Claude Code does natively - no separate command-wrapper layer.

Prerequisites: Node.js 18+ (to run the .mjs hooks and the generator), PowerShell 7+.

If run via `irm ... | iex` (evaluated as a scriptblock, no file on disk) or
from a copy that isn't sitting next to this repo's other source folders,
this script bootstraps itself: downloads the full repo into a scratch
directory and re-invokes the real install.ps1 from there, forwarding every
bound parameter. This is necessary because the installer's own sibling
folders (agents/, hooks/, skills/, install/lib/) are not carried along by a
bare `irm | iex` pipe - only the scriptblock text is.
#>
[CmdletBinding()]
param(
    [switch]$Claude,
    [switch]$Cursor,
    [switch]$Codex,
    [switch]$Anti,
    [switch]$Copilot,
    [string]$TargetPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/Unibean9/harness-skills'
$GeneratorMarker = 'install/lib/generate-runtime.mjs'

$scriptPath = $MyInvocation.MyCommand.Path
$sourceRoot = if ($scriptPath) { Split-Path -Parent $scriptPath } else { $null }
$generatorAtSource = if ($sourceRoot) { Join-Path $sourceRoot $GeneratorMarker } else { $null }

if (-not $sourceRoot -or -not (Test-Path $generatorAtSource)) {
    Write-Host "This script's source folders (agents/, hooks/, skills/) aren't next to it - downloading $RepoUrl ..."
    $bootstrapDir = Join-Path ([System.IO.Path]::GetTempPath()) ("hs-skills-bootstrap-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $bootstrapDir | Out-Null
    try {
        $zipPath = Join-Path $bootstrapDir 'repo.zip'
        Invoke-WebRequest -Uri "$RepoUrl/archive/refs/heads/main.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $bootstrapDir -Force
        $extractedRoot = (Get-ChildItem -Path $bootstrapDir -Directory | Where-Object { $_.Name -like 'harness-skills-*' } | Select-Object -First 1).FullName
        & (Join-Path $extractedRoot 'install.ps1') @PSBoundParameters
        $bootstrapExitCode = $LASTEXITCODE
    } finally {
        Remove-Item -Recurse -Force -LiteralPath $bootstrapDir -ErrorAction SilentlyContinue
    }
    exit $bootstrapExitCode
}

$targetClaude = Join-Path $TargetPath '.claude'
$generatorScript = $generatorAtSource

# Maps each non-Claude runtime name to its target dot-folder, used both to
# place its own kit-hooks/ copy and to report where it landed.
$RuntimeDotFolders = @{
    cursor      = '.cursor'
    codex       = '.codex'
    copilot     = '.github'
    antigravity = '.agents'
}

# Runtimes with a known fidelity gap (plan.md Architecture Decision A4) that
# must be surfaced in the terminal output itself, not just in documentation.
$FidelityWarnings = @{
    copilot = "Copilot hooks are confirmed for Copilot cloud agent + Copilot CLI only - VS Code Chat surface support for hooks is NOT confirmed by official docs. See README.md for the supported runtime surfaces."
}

$selected = @()
if ($Claude) { $selected += 'claude' }
if ($Cursor) { $selected += 'cursor' }
if ($Codex) { $selected += 'codex' }
if ($Anti) { $selected += 'antigravity' }
if ($Copilot) { $selected += 'copilot' }
if ($selected.Count -eq 0) { $selected = @('claude') }

$otherRuntimes = $selected | Where-Object { $_ -ne 'claude' }

# --- Generate every selected non-Claude runtime's content into its own
# scratch directory first. Nothing is copied into $TargetPath yet.

$tempDirs = @{}

function Remove-TempDirs {
    foreach ($dir in $tempDirs.Values) {
        Remove-Item -Recurse -Force -LiteralPath $dir -ErrorAction SilentlyContinue
    }
}

try {
    foreach ($runtimeName in $otherRuntimes) {
        $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("hs-skills-$runtimeName-" + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
        & node $generatorScript --runtime $runtimeName --source $sourceRoot --target $tempDir
        if ($LASTEXITCODE -ne 0) {
            throw "generate-runtime.mjs failed for '$runtimeName' (exit $LASTEXITCODE) - refusing to install any runtime."
        }
        $tempDirs[$runtimeName] = $tempDir
    }

    # --- Safety gates: run for ALL generated runtimes before ANY file is
    # copied into $TargetPath. A violation here fails the whole run, not
    # just one runtime - these are regression guards against a bug in the
    # generator itself, not against the (now nonexistent) static mirror.

    function Test-RuntimePathContainment {
        param([string]$RuntimeName, [string]$RuntimeRoot)
        $resolvedRoot = (Resolve-Path -LiteralPath $RuntimeRoot).Path
        Get-ChildItem -Path $RuntimeRoot -Recurse -Force | ForEach-Object {
            if ($_.LinkType) {
                throw "Security check failed: '$($_.FullName)' is a symlink in generated '$RuntimeName' content - refusing to install any runtime."
            }
            $resolved = (Resolve-Path -LiteralPath $_.FullName).Path
            if (-not $resolved.StartsWith($resolvedRoot)) {
                throw "Security check failed: '$($_.FullName)' resolves outside generated '$RuntimeName' content - refusing to install any runtime."
            }
        }
    }

    function Test-RuntimePlatformWiring {
        param([string]$RuntimeName, [string]$RuntimeRoot)
        $wiringFiles = Get-ChildItem -Path $RuntimeRoot -Recurse -File | Where-Object {
            $_.Name -eq 'hooks.json'
        }
        foreach ($file in $wiringFiles) {
            $content = Get-Content -Raw -LiteralPath $file.FullName
            foreach ($match in [regex]::Matches($content, '--platform\s+([A-Za-z0-9_-]+)')) {
                $value = $match.Groups[1].Value
                if ($value -ne $RuntimeName) {
                    throw "Build-time gate failed: '$($file.FullName)' is wired with --platform $value, expected $RuntimeName - refusing to install any runtime."
                }
            }
        }
    }

    foreach ($runtimeName in $otherRuntimes) {
        Test-RuntimePathContainment -RuntimeName $runtimeName -RuntimeRoot $tempDirs[$runtimeName]
        Test-RuntimePlatformWiring -RuntimeName $runtimeName -RuntimeRoot $tempDirs[$runtimeName]
    }

    $skippedExisting = @()
    $failedRuntimes = @()
    $installedRuntimes = @()

    # --- Claude: copy managed files without overwriting user-owned files.

    if ($selected -contains 'claude') {
        $folders = @('agents', 'hooks', 'skills')
        foreach ($folder in $folders) {
            $src = Join-Path $sourceRoot $folder
            if (-not (Test-Path $src)) {
                Write-Warning "Skipping '$folder': not found at '$src'."
                continue
            }
            $dst = Join-Path $targetClaude $folder
            New-Item -ItemType Directory -Force -Path $dst | Out-Null
            foreach ($file in Get-ChildItem -Path $src -Recurse -File) {
                $relativePath = $file.FullName.Substring($src.Length).TrimStart('\', '/')
                $destPath = Join-Path $dst $relativePath
                if (Test-Path $destPath) {
                    if (-not (Test-Path $destPath -PathType Leaf) -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $destPath -Algorithm SHA256).Hash) {
                        $skippedExisting += $destPath
                    }
                    continue
                }
                New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destPath) | Out-Null
                Copy-Item -Path $file.FullName -Destination $destPath
            }
            Write-Host "Copied $folder -> $dst"
        }

        $sourceConfig = Join-Path $sourceRoot '.hs.json'
        $targetConfig = Join-Path $TargetPath '.hs.json'
        if (Test-Path $targetConfig) {
            Write-Host "Skipped .hs.json: already exists at target ($targetConfig), not overwriting."
        } elseif (Test-Path $sourceConfig) {
            Copy-Item -Path $sourceConfig -Destination $targetConfig -Force
            Write-Host "Copied .hs.json -> $targetConfig"
        } else {
            Write-Warning "Source config not found at '$sourceConfig'."
        }

        $sourceHookSettings = Join-Path $sourceRoot 'hooks/hooks.json'
        $targetHookSettings = Join-Path $targetClaude 'settings.json'
        if (Test-Path $targetHookSettings) {
            Write-Host "Skipped Claude hook settings: already exists at target ($targetHookSettings), not overwriting."
        } elseif (Test-Path $sourceHookSettings) {
            Copy-Item -Path $sourceHookSettings -Destination $targetHookSettings -Force
            Write-Host "Copied Claude hook settings -> $targetHookSettings"
        } else {
            Write-Warning "Claude hook settings not found at '$sourceHookSettings'."
        }
    }

    # --- Every other selected runtime: copy its generated content into
    # $TargetPath, with per-runtime failure isolation (one runtime's error
    # doesn't abort the others) and a pre-copy existence check (skip +
    # report, never silently overwrite a file the kit doesn't own).

    foreach ($runtimeName in $otherRuntimes) {
        try {
            $runtimeRoot = $tempDirs[$runtimeName]
            $dotFolder = $RuntimeDotFolders[$runtimeName]
            $kitHooksRelative = "$dotFolder/kit-hooks"

            $sourceFiles = Get-ChildItem -Path $runtimeRoot -Recurse -File
            foreach ($file in $sourceFiles) {
                $relativePath = $file.FullName.Substring($runtimeRoot.Length).TrimStart('\', '/')
                $destPath = Join-Path $TargetPath $relativePath
                $isKitHooksFile = $relativePath.Replace('\', '/').StartsWith("$kitHooksRelative/")
                if ((Test-Path $destPath) -and -not $isKitHooksFile) {
                    if (-not (Test-Path $destPath -PathType Leaf) -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $destPath -Algorithm SHA256).Hash) {
                        $skippedExisting += $destPath
                    }
                    continue
                }
                New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destPath) | Out-Null
                Copy-Item -Path $file.FullName -Destination $destPath -Force
            }
            Write-Host "Installed $runtimeName -> $TargetPath/$dotFolder"

            if ($FidelityWarnings.ContainsKey($runtimeName)) {
                Write-Warning "$runtimeName fidelity gap: $($FidelityWarnings[$runtimeName])"
            }

            $installedRuntimes += $runtimeName
        } catch {
            Write-Warning "Failed to install '$runtimeName': $($_.Exception.Message)"
            $failedRuntimes += $runtimeName
        }
    }

    Write-Host ""
    Write-Host "Done. See README.md for how to use what was just installed."
    $allInstalled = @($selected | Where-Object { $_ -eq 'claude' -or $installedRuntimes -contains $_ })
    if ($allInstalled.Count -gt 0) {
        Write-Host "Installed: $($allInstalled -join ', ')"
    }
    if ($failedRuntimes.Count -gt 0) {
        Write-Host "Failed: $($failedRuntimes -join ', ') - see warnings above."
    }
    if ($skippedExisting.Count -gt 0) {
        Write-Host "Skipped (already existed, not overwritten):"
        $skippedExisting | ForEach-Object { Write-Host "  - $_" }
    }
    Write-Host "Note: non-Claude hook wiring files (hooks.json) are references only - merge"
    Write-Host "them into that runtime's own settings surface where required. Claude hook"
    Write-Host "settings are created only when the target has no existing .claude/settings.json."
} finally {
    Remove-TempDirs
}
