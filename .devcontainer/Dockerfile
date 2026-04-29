FROM node:24.15.0-bookworm

ENV DEVCONTAINER=true

# Explicit dependency manifest so a future base-image change can't silently
# remove things the dev container relies on:
#   - sudo: still needed for `chown -R node:node /home/node/.claude` on
#     CLAUDE_CONFIG_DIR volume initialization (volumes start root-owned).
#   - tinyproxy: outbound network allowlist (Level 1 restriction).
#   - git, curl, ca-certificates: post-create scripts shell out to git
#     (gh auth setup-git, repo-local config) and curl (connectivity test
#     / install-just download). The non-slim node image already ships these,
#     but installing them explicitly makes the dependency contract obvious.
# The official Node image ships `node` user (uid 1000) but no sudo by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        sudo tinyproxy git curl ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && printf '%s\n' \
        "node ALL=(root) NOPASSWD: /usr/bin/chown -R node\\:node /home/node/.claude" \
        > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# tinyproxy log directory — owned by `node` so the daemon (running as `node`)
# can write LogFile / PidFile without sudo. See tinyproxy.conf for the rationale.
RUN mkdir -p /var/log/tinyproxy \
    && chown -R node:node /var/log/tinyproxy

# Enable corepack so the `pnpm` / `yarn` shims live in /usr/local/bin and the
# version pinned in package.json (`packageManager`) is auto-resolved.
# The official `node:` image bundles corepack but leaves it disabled by default,
# unlike the MS `typescript-node` image we used previously.
RUN corepack enable

# User-writable npm prefix (sudo-free global install) — used for Claude Code, ccusage, just
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="${NPM_CONFIG_PREFIX}/bin:${PATH}"
RUN mkdir -p /home/node/.npm-global \
    && chown -R node:node /home/node/.npm-global

# Copy tinyproxy configuration (allowlist.txt is bind-mounted via devcontainer.json)
COPY tinyproxy.conf /etc/tinyproxy/tinyproxy.conf
