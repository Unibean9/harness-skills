#!/usr/bin/env bash
# Installs the student harness kit into a target project. Selects one or more
# runtimes via long flags (--claude --cursor --codex --anti --kiro --copilot);
# flags are additive, and no flags passed defaults to --claude only (matches
# install.ps1's default-to-claude behavior).
#
# --claude copies the 4 flat source folders (agents/ commands/ hooks/ skills/)
# into <target-path>/.claude/{agents,commands,hooks,skills}, and copies this
# repo's .hs.settings.json to <target-path>/.hs.json (skipped if the target
# already has one).
#
# Every other selected runtime's content is GENERATED, not copied from a
# static mirror: agents/, commands/hs/, skills/, and hooks/ stay the single
# source of truth, and install/lib/generate-runtime.mjs maps them into that
# runtime's own shape (see docs/RUNTIME-MAPPING.md) into a scratch directory,
# which is then copied into <target-path>/ the same safe way --claude already
# was. hooks/*.mjs are additionally copied into that runtime's own
# `<dot-folder>/kit-hooks/` subfolder - never into a single shared folder.
#
# Prerequisites: Node.js 18+ (to run the .mjs hooks and the generator), bash.
# Invoke as: bash install.sh [--claude] [--cursor] [--codex] [--anti] [--kiro] [--copilot] [--target-path DIR]
#
# If run via `curl ... | bash` (piped from stdin, no file on disk) or from a
# copy that isn't sitting next to this repo's other source folders, this
# script bootstraps itself: downloads the full repo into a scratch
# directory and re-invokes the real install.sh from there, forwarding every
# argument. This is necessary because the installer's own sibling folders
# (agents/, commands/, hooks/, skills/, install/lib/) are not carried along
# by a bare `curl | bash` pipe - only this one file is.

set -euo pipefail

REPO_URL="https://github.com/Unibean9/harness-skills"
GENERATOR_MARKER="install/lib/generate-runtime.mjs"

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
if [ -n "$SCRIPT_PATH" ] && [ -f "$SCRIPT_PATH" ]; then
    SOURCE_ROOT="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
else
    SOURCE_ROOT=""
fi

if [ -z "$SOURCE_ROOT" ] || [ ! -f "$SOURCE_ROOT/$GENERATOR_MARKER" ]; then
    echo "This script's source folders (agents/, commands/, hooks/, skills/) aren't next to it - downloading $REPO_URL ..." >&2
    BOOTSTRAP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hs-skills-bootstrap-XXXXXX")"
    trap 'rm -rf "$BOOTSTRAP_DIR"' EXIT
    if command -v git >/dev/null 2>&1; then
        git clone --depth 1 "$REPO_URL.git" "$BOOTSTRAP_DIR/repo" >&2
        EXTRACTED_ROOT="$BOOTSTRAP_DIR/repo"
    else
        curl -fsSL -o "$BOOTSTRAP_DIR/repo.tar.gz" "$REPO_URL/archive/refs/heads/main.tar.gz"
        mkdir -p "$BOOTSTRAP_DIR/extracted"
        tar -xzf "$BOOTSTRAP_DIR/repo.tar.gz" -C "$BOOTSTRAP_DIR/extracted" --strip-components=1
        EXTRACTED_ROOT="$BOOTSTRAP_DIR/extracted"
    fi
    set +e
    bash "$EXTRACTED_ROOT/install.sh" "$@"
    BOOTSTRAP_EXIT_CODE=$?
    set -e
    exit $BOOTSTRAP_EXIT_CODE
fi

TARGET_PATH="$(pwd)"
GENERATOR_SCRIPT="$SOURCE_ROOT/$GENERATOR_MARKER"

SEL_CLAUDE=0
SEL_CURSOR=0
SEL_CODEX=0
SEL_ANTI=0
SEL_KIRO=0
SEL_COPILOT=0

while [ $# -gt 0 ]; do
    case "$1" in
        --claude) SEL_CLAUDE=1; shift ;;
        --cursor) SEL_CURSOR=1; shift ;;
        --codex) SEL_CODEX=1; shift ;;
        --anti) SEL_ANTI=1; shift ;;
        --kiro) SEL_KIRO=1; shift ;;
        --copilot) SEL_COPILOT=1; shift ;;
        --target-path)
            TARGET_PATH="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [ "$SEL_CLAUDE" -eq 0 ] && [ "$SEL_CURSOR" -eq 0 ] && [ "$SEL_CODEX" -eq 0 ] && \
   [ "$SEL_ANTI" -eq 0 ] && [ "$SEL_KIRO" -eq 0 ] && [ "$SEL_COPILOT" -eq 0 ]; then
    SEL_CLAUDE=1
fi

mkdir -p "$TARGET_PATH"
TARGET_PATH="$(cd "$TARGET_PATH" && pwd)"

# Runtime name -> target dot-folder, used both to place its own kit-hooks/
# copy and to report where it landed.
runtime_dot_folder() {
    case "$1" in
        cursor) echo ".cursor" ;;
        codex) echo ".codex" ;;
        copilot) echo ".github" ;;
        kiro) echo ".kiro" ;;
        antigravity) echo ".agents" ;;
    esac
}

# Runtimes with a known fidelity gap (plan.md Architecture Decision A4) that
# must be surfaced in the terminal output itself, not just in documentation.
fidelity_warning() {
    case "$1" in
        copilot) echo "Copilot hooks are confirmed for Copilot cloud agent + Copilot CLI only - VS Code Chat surface support for hooks is NOT confirmed by official docs. See docs/RUNTIME-MAPPING.md." ;;
        *) echo "" ;;
    esac
}

OTHER_RUNTIMES=""
[ "$SEL_CURSOR" -eq 1 ] && OTHER_RUNTIMES="$OTHER_RUNTIMES cursor"
[ "$SEL_CODEX" -eq 1 ] && OTHER_RUNTIMES="$OTHER_RUNTIMES codex"
[ "$SEL_ANTI" -eq 1 ] && OTHER_RUNTIMES="$OTHER_RUNTIMES antigravity"
[ "$SEL_KIRO" -eq 1 ] && OTHER_RUNTIMES="$OTHER_RUNTIMES kiro"
[ "$SEL_COPILOT" -eq 1 ] && OTHER_RUNTIMES="$OTHER_RUNTIMES copilot"

# --- Generate every selected non-Claude runtime's content into its own
# scratch directory first. Nothing is copied into $TARGET_PATH yet. Cleaned
# up on exit regardless of success/failure.

TEMP_DIRS=""
cleanup_temp_dirs() {
    for dir in $TEMP_DIRS; do
        rm -rf "$dir"
    done
}
trap cleanup_temp_dirs EXIT

declare -A RUNTIME_TEMP_DIR
for runtime_name in $OTHER_RUNTIMES; do
    temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/hs-skills-$runtime_name-XXXXXX")"
    if ! node "$GENERATOR_SCRIPT" --runtime "$runtime_name" --source "$SOURCE_ROOT" --target "$temp_dir"; then
        echo "generate-runtime.mjs failed for '$runtime_name' - refusing to install any runtime." >&2
        exit 1
    fi
    RUNTIME_TEMP_DIR["$runtime_name"]="$temp_dir"
    TEMP_DIRS="$TEMP_DIRS $temp_dir"
done

# --- Safety gates: run for ALL generated runtimes before ANY file is copied
# into $TARGET_PATH. A violation here fails the whole run, not just one
# runtime - these are regression guards against a bug in the generator
# itself, not against a static mirror (there is none anymore).

check_path_containment() {
    runtime_name="$1"
    runtime_root="$2"
    resolved_root="$(cd "$runtime_root" && pwd)"
    while IFS= read -r -d '' entry; do
        if [ -L "$entry" ]; then
            echo "Security check failed: '$entry' is a symlink in generated '$runtime_name' content - refusing to install any runtime." >&2
            exit 1
        fi
        resolved="$(cd "$(dirname "$entry")" && pwd)/$(basename "$entry")"
        case "$resolved" in
            "$resolved_root"/*) ;;
            *)
                echo "Security check failed: '$entry' resolves outside generated '$runtime_name' content - refusing to install any runtime." >&2
                exit 1
                ;;
        esac
    done < <(find "$runtime_root" -type f -print0)
}

check_platform_wiring() {
    runtime_name="$1"
    runtime_root="$2"
    while IFS= read -r -d '' file; do
        wired_value="$(grep -oE -- '--platform[[:space:]]+[A-Za-z0-9_-]+' "$file" | awk '{print $2}' || true)"
        for value in $wired_value; do
            if [ "$value" != "$runtime_name" ]; then
                echo "Build-time gate failed: '$file' is wired with --platform $value, expected $runtime_name - refusing to install any runtime." >&2
                exit 1
            fi
        done
    done < <(find "$runtime_root" -type f \( -name 'hooks.json' -o -name '*.kiro.hook' \) -print0)
}

for runtime_name in $OTHER_RUNTIMES; do
    check_path_containment "$runtime_name" "${RUNTIME_TEMP_DIR[$runtime_name]}"
    check_platform_wiring "$runtime_name" "${RUNTIME_TEMP_DIR[$runtime_name]}"
done

# --- Claude: same behavior as install.ps1's --claude branch.

if [ "$SEL_CLAUDE" -eq 1 ]; then
    for folder in agents commands hooks skills; do
        src="$SOURCE_ROOT/$folder"
        if [ ! -d "$src" ]; then
            echo "WARNING: Skipping '$folder': not found at '$src'." >&2
            continue
        fi
        dst="$TARGET_PATH/.claude/$folder"
        mkdir -p "$dst"
        cp -R "$src/." "$dst/"
        echo "Copied $folder -> $dst"
    done

    source_config="$SOURCE_ROOT/.hs.settings.json"
    target_config="$TARGET_PATH/.hs.json"
    if [ -f "$target_config" ]; then
        echo "Skipped .hs.json: already exists at target ($target_config), not overwriting."
    elif [ -f "$source_config" ]; then
        cp "$source_config" "$target_config"
        echo "Copied .hs.settings.json -> $target_config"
    else
        echo "WARNING: Source config not found at '$source_config'." >&2
    fi
fi

# --- Every other selected runtime: copy its generated content into
# $TARGET_PATH, with per-runtime failure isolation (one runtime's error
# doesn't abort the others) and a pre-copy existence check (skip + report,
# never silently overwrite a file the kit doesn't own).

SKIPPED_EXISTING=""
FAILED_RUNTIMES=""
INSTALLED_RUNTIMES=""

install_runtime() {
    runtime_name="$1"
    runtime_root="${RUNTIME_TEMP_DIR[$runtime_name]}"
    dot_folder="$(runtime_dot_folder "$runtime_name")"
    kit_hooks_relative="$dot_folder/kit-hooks"

    while IFS= read -r -d '' file; do
        relative_path="${file#"$runtime_root"/}"
        dest_path="$TARGET_PATH/$relative_path"
        case "$relative_path" in
            "$kit_hooks_relative"/*) is_kit_hooks=1 ;;
            *) is_kit_hooks=0 ;;
        esac
        if [ -e "$dest_path" ] && [ "$is_kit_hooks" -eq 0 ]; then
            SKIPPED_EXISTING="$SKIPPED_EXISTING
  - $dest_path"
            continue
        fi
        mkdir -p "$(dirname "$dest_path")"
        cp "$file" "$dest_path"
    done < <(find "$runtime_root" -type f -print0)
    echo "Installed $runtime_name -> $TARGET_PATH/$dot_folder"

    warning="$(fidelity_warning "$runtime_name")"
    if [ -n "$warning" ]; then
        echo "WARNING: $runtime_name fidelity gap: $warning" >&2
    fi
    return 0
}

for runtime_name in $OTHER_RUNTIMES; do
    if install_runtime "$runtime_name"; then
        INSTALLED_RUNTIMES="$INSTALLED_RUNTIMES $runtime_name"
    else
        echo "WARNING: Failed to install '$runtime_name'." >&2
        FAILED_RUNTIMES="$FAILED_RUNTIMES $runtime_name"
    fi
done

echo ""
echo "Done. See README.md for how to use what was just installed."
ALL_INSTALLED=""
[ "$SEL_CLAUDE" -eq 1 ] && ALL_INSTALLED="claude"
for runtime_name in $INSTALLED_RUNTIMES; do
    ALL_INSTALLED="$ALL_INSTALLED $runtime_name"
done
if [ -n "$ALL_INSTALLED" ]; then
    echo "Installed:$ALL_INSTALLED"
fi
if [ -n "$FAILED_RUNTIMES" ]; then
    echo "Failed:$FAILED_RUNTIMES - see warnings above."
fi
if [ -n "$SKIPPED_EXISTING" ]; then
    echo "Skipped (already existed, not overwritten):$SKIPPED_EXISTING"
fi
echo "Note: each runtime's own hook wiring file (hooks.json / *.kiro.hook) is a"
echo "reference only - merge it into that runtime's own settings surface yourself"
echo "where that runtime requires it (this script does not edit runtime settings)."
