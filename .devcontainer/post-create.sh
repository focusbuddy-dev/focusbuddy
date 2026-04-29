#!/usr/bin/env bash
set -euo pipefail

# Post-create initialization for focusbuddy devcontainer.
# Runs once after the container is created.
#
# Order:
#   0. Start tinyproxy (subsequent network calls go through allowlist)
#   1. gh auth setup-git (HTTPS push via GH_TOKEN)
#   2. Install Claude Code CLI (npm-global, supply-chain cooling)
#   3. Install ccusage
#   4. Verify Python (used by .claude/hooks/*.py — Phase 3 で導入予定)
#   5. Ensure CLAUDE_CONFIG_DIR ownership (volume init quirk)
#   6. corepack pnpm activate (focusbuddy: pnpm-only)
#   7. install-just.sh
#   8. Reflect host git user.name/email (initialize.sh が .devcontainer.env に書いた値)
#   9. repo-local git config (pull.rebase=false / commit.gpgsign=false)
#  10. Note: pnpm install は intentionally skip(README ポリシー)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[post-create] Setting up development environment..."

# 0. Start tinyproxy
"${SCRIPT_DIR}/start-proxy.sh"

# 1. Configure git credential helper via gh CLI
if [ -n "${GH_TOKEN:-}" ]; then
    echo "[post-create] Configuring gh auth (GH_TOKEN detected)..."
    gh auth setup-git
    echo "[post-create] gh auth setup-git complete"
else
    echo "[post-create] WARNING: GH_TOKEN not set. gh auth will not be configured." >&2
fi

# 2. Install Claude Code CLI
#    supply-chain 対策: --min-release-age=3(3 日 cooling、npm 11.10.0+ 組込)。
#    pin は付けない(cooling で supply chain は担保、dev container 用途で再現性は捨てる)。
#    NPM_CONFIG_PREFIX により user-writable prefix へ install するため sudo 不要。
echo "[post-create] Installing @anthropic-ai/claude-code (min-release-age=3)..."
npm install -g --min-release-age=3 @anthropic-ai/claude-code
echo "[post-create] Claude Code CLI installed: $(claude --version)"

# 3. Install ccusage (Claude Code usage monitor)
echo "[post-create] Installing ccusage (min-release-age=3)..."
npm install -g --min-release-age=3 ccusage
echo "[post-create] ccusage installed: $(ccusage --version)"

# 4. Verify Python (Phase 3 で .claude/hooks/*.py が依存)
echo "[post-create] Python version: $(python3 --version)"

# 5. Ensure CLAUDE_CONFIG_DIR is owned by node (volume 初回作成時は root 所有)
#    sudoers は /home/node/.claude にハードコードされているため、一致を検証する
: "${CLAUDE_CONFIG_DIR:?CLAUDE_CONFIG_DIR must be set}"
ALLOWED_CLAUDE_CONFIG_DIR="/home/node/.claude"
NORMALIZED_CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR%/}"
if [ -z "${NORMALIZED_CLAUDE_CONFIG_DIR}" ]; then
    NORMALIZED_CLAUDE_CONFIG_DIR="/"
fi
if [ "${NORMALIZED_CLAUDE_CONFIG_DIR}" != "${ALLOWED_CLAUDE_CONFIG_DIR}" ]; then
    echo "[post-create] ERROR: CLAUDE_CONFIG_DIR must be ${ALLOWED_CLAUDE_CONFIG_DIR} for sudoers compatibility; got ${CLAUDE_CONFIG_DIR}" >&2
    exit 1
fi
echo "[post-create] Ensuring ${ALLOWED_CLAUDE_CONFIG_DIR} ownership (node:node)..."
sudo chown -R node:node "${ALLOWED_CLAUDE_CONFIG_DIR}"

# 6. Bootstrap pnpm via corepack (focusbuddy: pnpm-only policy)
expected_package_manager="$({
    node --input-type=module -e "import { readFileSync } from 'node:fs'; console.log(JSON.parse(readFileSync('./package.json', 'utf8')).packageManager);"
})"
node --version
corepack --version
printf '[post-create] Using package manager from package.json: %s\n' "$expected_package_manager"
corepack prepare "$expected_package_manager" --activate
pnpm --version

# 7. Install just task runner
bash "${SCRIPT_DIR}/install-just.sh"
just --version

# 8. ホスト側 git user を継承(initialize.sh が .devcontainer.env に書いた値)
if [ -n "${HOST_GIT_USER_NAME:-}" ]; then
    git config --global user.name "$HOST_GIT_USER_NAME"
    echo "[post-create] git user.name set: $HOST_GIT_USER_NAME"
fi
if [ -n "${HOST_GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "$HOST_GIT_USER_EMAIL"
    echo "[post-create] git user.email set: $HOST_GIT_USER_EMAIL"
fi
if [ -z "${HOST_GIT_USER_NAME:-}" ] || [ -z "${HOST_GIT_USER_EMAIL:-}" ]; then
    echo "[post-create] WARNING: HOST_GIT_USER_NAME/EMAIL not set. git commits may fail." >&2
fi

# 9. repo-local git config
#    - pull は merge で行う(force push 禁止 hook + resolve-conflict skill が merge 前提、Phase 3)
#    - commit signing 無効化(host 側 ~/.gitconfig 漏れ防止、focusbuddy は unsigned 運用)
echo "[post-create] Configuring repo-local git settings..."
git -C /workspaces/focusbuddy config pull.rebase false
git -C /workspaces/focusbuddy config commit.gpgsign false

# 10. Repository dependency installation policy
#     Intentionally NOT running `pnpm install` here. Use `just commitlint-setup`
#     for the reproducible initial setup flow.
printf '%s\n' '[post-create] Repository dependencies are intentionally not installed during post-create.'
printf '%s\n' '[post-create] Run `just commitlint-setup` for the reproducible initial setup flow.'

echo "[post-create] Setup complete."
