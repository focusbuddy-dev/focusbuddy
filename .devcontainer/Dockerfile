FROM node:24.15.0-bookworm

ENV DEVCONTAINER=true

# Install sudo + tinyproxy for outbound network allowlist.
# sudo is required for chown in post-create.sh (CLAUDE_CONFIG_DIR volume init).
# The official Node image ships `node` user (uid 1000) but no sudo by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends sudo tinyproxy \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && printf '%s\n' \
        "node ALL=(root) NOPASSWD: /usr/bin/chown -R node\\:node /home/node/.claude" \
        "node ALL=(root) NOPASSWD: /usr/bin/tinyproxy" \
        > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# User-writable npm prefix (sudo-free global install) — used for Claude Code, ccusage, just
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="${NPM_CONFIG_PREFIX}/bin:${PATH}"
RUN mkdir -p /home/node/.npm-global \
    && chown -R node:node /home/node/.npm-global

# Copy tinyproxy configuration (allowlist.txt is bind-mounted via devcontainer.json)
COPY tinyproxy.conf /etc/tinyproxy/tinyproxy.conf
