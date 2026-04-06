#!/usr/bin/env bash
set -euo pipefail

# Store the public key file that Git will use for SSH commit signing.
# The host path such as /Users/... does not exist inside the dev container,
# so regenerate this file from the forwarded ssh-agent on each container start.
signing_key_file="$HOME/.ssh/github_signing_key.pub"

# Ensure the SSH directory exists with the expected permissions.
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Read public keys from the forwarded ssh-agent.
# This script uses the first key by default.
# If you use multiple keys, replace this with explicit key selection logic.
key="$(ssh-add -L 2>/dev/null | sed -n '1p')"

# Do not fail container startup if no key is available in the agent.
# This keeps the dev container usable even when agent forwarding is missing.
if [[ -z "$key" ]] || [[ "$key" == The\ agent\ has\ no\ identities.* ]]; then
  echo "No SSH key found in agent; skipping Git signing setup."
  exit 0
fi

# Write the public key to a real file that Git can reference for SSH signing.
printf '%s\n' "$key" > "$signing_key_file"
chmod 600 "$signing_key_file"

# Configure Git to sign commits with SSH using the generated public key file.
git config --global gpg.format ssh
git config --global commit.gpgsign true
git config --global user.signingkey "$signing_key_file"

# Print the configured key path for easier debugging.
echo "Configured Git SSH signing with: $signing_key_file"