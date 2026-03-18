#!/usr/bin/env bash
# Sync main to Hugging Face Spaces as a history-free snapshot.
# Usage: bash scripts/sync-space.sh

set -euo pipefail

REMOTES=("space" "space-show")
SOURCE_BRANCH="main"
TEMP_BRANCH="__space-sync-tmp"

# Binary files blocked by HF Spaces git server.
EXCLUDE_PATTERNS=(
  "public/readme-images/*.png"
  "src/audio/tracks/*.mp3"
)

current=$(git branch --show-current)
if [ "$current" != "$SOURCE_BRANCH" ]; then
  echo "Error: please checkout $SOURCE_BRANCH first"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree not clean, please commit or stash first"
  exit 1
fi

git checkout --orphan "$TEMP_BRANCH"
git add -A

for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  git rm -rf --cached --ignore-unmatch $pattern 2>/dev/null || true
done

git commit -m "Sync from main: $(git log $SOURCE_BRANCH -1 --format='%h %s')"

for remote in "${REMOTES[@]}"; do
  echo "Pushing to $remote..."
  if git push "$remote" "$TEMP_BRANCH:main" --force; then
    echo "  ✓ $remote pushed"
  else
    echo "  ✗ $remote push failed"
  fi
done

git checkout -f "$SOURCE_BRANCH"
git branch -D "$TEMP_BRANCH"

echo "Done!"
