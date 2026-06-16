#!/usr/bin/env bash
# Check documentation links using lychee.
#
# Usage:
#   ./scripts/check-links.sh           # check all doc pages
#   ./scripts/check-links.sh --verbose  # with detailed output
#
# Install lychee:
#   brew install lychee          (macOS)
#   cargo install lychee         (Rust/cargo)
#   dnf install lychee           (Fedora)
#   Or grab a binary from https://github.com/lycheeverse/lychee/releases

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v lychee &>/dev/null; then
  echo "Error: lychee is not installed."
  echo "Install it via: brew install lychee | cargo install lychee | dnf install lychee"
  echo "Or download from https://github.com/lycheeverse/lychee/releases"
  exit 1
fi

echo "Checking links in src/content/docs/ ..."

lychee -vv\
  --config "${REPO_ROOT}/.lychee.toml" \
  "$@" \
  "${REPO_ROOT}/src/content/docs/**/*.md" \
  "${REPO_ROOT}/src/content/docs/**/*.mdx"
