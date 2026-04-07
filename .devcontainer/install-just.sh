#!/usr/bin/env bash

# Install a pinned just binary so developer task entrypoints stay consistent in the dev container.

set -euo pipefail

just_version="1.49.0"

if command -v just >/dev/null 2>&1; then
	installed_version="$(just --version | awk '{print $2}')"
	if [[ "$installed_version" == "$just_version" ]]; then
		exit 0
	fi
	printf 'Updating just from %s to %s\n' "$installed_version" "$just_version"
	fi

case "$(uname -s)-$(uname -m)" in
	Linux-aarch64|Linux-arm64)
		target="aarch64-unknown-linux-musl"
		;;
	Linux-x86_64|Linux-amd64)
		target="x86_64-unknown-linux-musl"
		;;
	Darwin-aarch64|Darwin-arm64)
		target="aarch64-apple-darwin"
		;;
	Darwin-x86_64)
		target="x86_64-apple-darwin"
		;;
	*)
		printf 'Unsupported platform for just installation: %s-%s\n' "$(uname -s)" "$(uname -m)" >&2
		exit 1
		;;
esac

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

archive="just-${just_version}-${target}.tar.gz"
base_url="https://github.com/casey/just/releases/download/${just_version}"

# Download the release artifact and verify it before installing the binary.
curl -fsSL -o "$tmp_dir/$archive" "$base_url/$archive"
curl -fsSL -o "$tmp_dir/SHA256SUMS" "$base_url/SHA256SUMS"

(
	cd "$tmp_dir"
	grep " ${archive}$" SHA256SUMS | sha256sum --check --status
)

tar -xzf "$tmp_dir/$archive" -C "$tmp_dir"

if command -v sudo >/dev/null 2>&1; then
	sudo -n install -m 0755 "$tmp_dir/just" /usr/local/bin/just
else
	install -m 0755 "$tmp_dir/just" /usr/local/bin/just
fi