#!/usr/bin/env pwsh
<#
Installs the student harness kit into a target project. Selects one or more
runtimes via switch flags (-Claude -Cursor -Codex -Anti -Kiro -Copilot);
flags are additive, and no flags passed defaults to -Claude only (unchanged
prior behavior).

-Claude copies the 4 flat source folders (agents/ commands/ hooks/ skills/)
into <TargetPath>/.claude/{agents,commands,hooks,skills}, and copies this
repo's .hs.settings.json to <TargetPath>/.hs.json (skipped if the target
already has one) - exactly as before this script gained other runtimes.

Every other selected runtime's content is GENERATED, not copied from a
static mirror: agents/, commands/hs/, skills/, and hooks/ stay the single
source of truth, and install/lib/generate-runtime.mjs maps them into that
runtime's own shape (see docs/RUNTIME-MAPPING.md) into a scratch directory,
which is then copied into <TargetPath>/ the same safe way -Claude already
was. hooks/*.mjs are additionally copied into that runtime's own
`<dot-folder>/kit-hooks/` subfolder - never into a single shared folder.

Prerequisites: Node.js 18+ (to run the .mjs hooks and the generator), PowerShell 7+.

If run via `irm ... | iex` (evaluated as a scriptblock, no file on disk) or
from a copy that isn't sitting next to this repo's other source folders,
this script bootstraps itself: downloads the full repo into a scratch
directory and re-invokes the real install.ps1 from there, forwarding every
bound parameter. This is necessary because the installer's own sibling
folders (agents/, commands/, hooks/, skills/, install/lib/) are not carried
along by a bare `irm | iex` pipe - only the scriptblock text is.
#>
param(
    [switch]$Claude,
    [switch]$Cursor,
    [switch]$Codex,
    [switch]$Anti,
    [switch]$Kiro,
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
    Write-Host "This script's source folders (agents/, commands/, hooks/, skills/) aren't next to it - downloading $RepoUrl ..."
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
    kiro        = '.kiro'
    antigravity = '.agents'
}

# Runtimes with a known fidelity gap (plan.md Architecture Decision A4) that
# must be surfaced in the terminal output itself, not just in documentation.
$FidelityWarnings = @{
    copilot = "Copilot hooks are confirmed for Copilot cloud agent + Copilot CLI only - VS Code Chat surface support for hooks is NOT confirmed by official docs. See docs/RUNTIME-MAPPING.md."
}

$selected = @()
if ($Claude) { $selected += 'claude' }
if ($Cursor) { $selected += 'cursor' }
if ($Codex) { $selected += 'codex' }
if ($Anti) { $selected += 'antigravity' }
if ($Kiro) { $selected += 'kiro' }
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
            $_.Name -eq 'hooks.json' -or $_.Name -like '*.kiro.hook'
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

    # --- Claude: unchanged from before this script gained other runtimes.

    if ($selected -contains 'claude') {
        $folders = @('agents', 'commands', 'hooks', 'skills')
        foreach ($folder in $folders) {
            $src = Join-Path $sourceRoot $folder
            if (-not (Test-Path $src)) {
                Write-Warning "Skipping '$folder': not found at '$src'."
                continue
            }
            $dst = Join-Path $targetClaude $folder
            New-Item -ItemType Directory -Force -Path $dst | Out-Null
            Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
            Write-Host "Copied $folder -> $dst"
        }

        $sourceConfig = Join-Path $sourceRoot '.hs.settings.json'
        $targetConfig = Join-Path $TargetPath '.hs.json'
        if (Test-Path $targetConfig) {
            Write-Host "Skipped .hs.json: already exists at target ($targetConfig), not overwriting."
        } elseif (Test-Path $sourceConfig) {
            Copy-Item -Path $sourceConfig -Destination $targetConfig -Force
            Write-Host "Copied .hs.settings.json -> $targetConfig"
        } else {
            Write-Warning "Source config not found at '$sourceConfig'."
        }
    }

    # --- Every other selected runtime: copy its generated content into
    # $TargetPath, with per-runtime failure isolation (one runtime's error
    # doesn't abort the others) and a pre-copy existence check (skip +
    # report, never silently overwrite a file the kit doesn't own).

    $skippedExisting = @()
    $failedRuntimes = @()
    $installedRuntimes = @()

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
                    $skippedExisting += $destPath
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
    Write-Host "Note: each runtime's own hook wiring file (hooks.json / *.kiro.hook) is a"
    Write-Host "reference only - merge it into that runtime's own settings surface yourself"
    Write-Host "where that runtime requires it (this script does not edit runtime settings)."
} finally {
    Remove-TempDirs
}
