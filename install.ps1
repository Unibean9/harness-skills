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

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path ".agents/skills")) {
    Write-Error ".agents/skills not found -- run this from the harness-skills repo root"
    exit 1
}

New-Item -ItemType Directory -Force -Path ".claude/skills" | Out-Null

Get-ChildItem -Directory ".agents/skills" | ForEach-Object {
    $name = $_.Name
    $target = ".claude/skills/$name"
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target -Confirm:$false
    }
    New-Item -ItemType Junction -Path $target -Target $_.FullName | Out-Null
    Write-Output "linked $target -> .agents/skills/$name"
}

Write-Output ""
Write-Output "Done. Codex CLI and Gemini CLI already read .agents/skills/ directly -- no action needed for them."
Write-Output "Claude Code hook example (optional): merge hooks/claude-code/settings.snippet.json into .claude/settings.json"
