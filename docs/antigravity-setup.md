# Using harness-skills with Antigravity CLI

Antigravity CLI (`agy`) is Google's successor to Gemini CLI — announced May
2026, transitioning Gemini CLI's free/Pro/Ultra end-user product over to the
new tool while `google-gemini/gemini-cli` continues as an active,
independent open-source repo. Google's own announcement states Antigravity
CLI "retains our most critical features, including Agent Skills, Hooks,
Subagents, and Extensions (now Antigravity plugins)" — so it inherits
Gemini CLI's engine for all of this, rebranded. This repo has no dedicated
`.antigravity-plugin/plugin.json` or Antigravity-specific hook snippet yet;
until it does, treat Gemini CLI's config shapes (below) as the closest known
approximation and verify against Antigravity's own docs before relying on
exact file names.

## Install

**One command (skills + subagents, hooks not wired):**

```bash
npm exec -- hs setup --target antigravity
```

Writes `.antigravity/skills/` and `.antigravity/agents/` (Gemini-shaped
subagent files, since Antigravity inherits Gemini CLI's format) — and prints
a warning that `.antigravity/` is an unconfirmed path guess to verify against
Antigravity's own docs. Requires the package installed locally
(`npm i -D github:Unibean9/harness-skills`).

**Skills only (needs network + a real Antigravity CLI install to resolve
where files land):**

```bash
npx skills add Unibean9/harness-skills -a antigravity
```

Copies/symlinks the six `hs-*` `SKILL.md` files into wherever Antigravity
looks for skills. No hooks, no subagents, no plugin manifest.

**Manual fallback (works offline, no Antigravity binary required to try):**
Since Antigravity inherits Gemini CLI's engine, do exactly what
`docs/gemini-setup.md` says, verbatim — same commands, same paths, same
`.gemini/...` filenames — and only rename `.gemini/` to whatever Antigravity's
own config directory turns out to be once you've confirmed it against
Antigravity's own docs. As a starting guess (unconfirmed, verify before
trusting it):

```bash
mkdir -p .antigravity/skills
cp -r /path/to/harness-skills/skills/hs-* .antigravity/skills/
```

If `.antigravity/skills/` turns out to be wrong for your build, this is the
one line to change — the skill files themselves are agent-agnostic.

**Native plugin:** Antigravity plugins descend from Gemini CLI's extension
mechanism (`gemini extensions install <url>` + `gemini-extension.json`), per
Google's announcement, but the exact Antigravity-side install command and
manifest filename weren't independently confirmed at the time of writing —
if your Antigravity CLI has a `plugin install`/`extensions install`
equivalent, point it at this repo the same way `docs/gemini-setup.md`
describes and confirm `AGENTS.md`/`skills/` actually load before relying on
it.

## Hooks (inherited from Gemini CLI, unconfirmed exact path for Antigravity)

Same event set as Gemini CLI (see `docs/gemini-setup.md`'s Hooks section):
`SessionStart`/`SessionEnd`, `BeforeAgent`/`AfterAgent`, `BeforeModel`/
`AfterModel`, `BeforeTool`/`AfterTool`, `PreCompress`, `Notification`. This
repo doesn't ship an Antigravity hooks snippet — `hooks/gemini/settings.snippet.json`
is the closest starting point, but confirm Antigravity's actual config file
location before merging it there.

## Subagents (inherited from Gemini CLI, unconfirmed exact path for Antigravity)

Same shape as Gemini CLI's `.gemini/agents/*.md` (Markdown + YAML
frontmatter, `name`/`description`, invoked automatically or via
`@agent_name`) — see `docs/agents.md`'s "Per-agent wiring" for `hs-scout`/
`hs-reviewer` responsibilities. `npm exec -- hs agents` does **not** have an
`antigravity` target (only `claude`/`codex`/`gemini`/`cursor` — it errors
with `unknown agent target: antigravity`). The closest working path: run
`npm exec -- hs agents --target gemini`, which writes
`.gemini/agents/hs-scout.md`/`hs-reviewer.md`, then copy those two files into
wherever you've confirmed Antigravity's own agents directory to be.

## Troubleshooting

| Symptom | Check |
|---|---|
| Unsure if you're on Gemini CLI or Antigravity CLI | Check which binary/package is actually installed — the two are separate, actively-developed repos during this transition, not the same install. |
| Skills not found | Confirm `npx skills add ... -a antigravity` actually placed files where your Antigravity build looks, since this repo has no native manifest to fall back on; or use the manual fallback above. |
| Hooks/subagents don't fire | Expected — this repo hasn't shipped Antigravity-specific config yet; verify Antigravity's actual config file paths against its own docs before assuming the Gemini-shaped snippet above applies unmodified. |
| `hs agents --target antigravity` errors | By design — there's no Antigravity target. Use `--target gemini` and copy the two generated files into Antigravity's own agents directory once confirmed. |
