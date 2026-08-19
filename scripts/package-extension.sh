#!/usr/bin/env bash
#
# Packages the extension for submission to the Chrome Web Store and
# Firefox Add-ons: manifest.json, background.js, and every site/utils/
# popup/public file the extension actually loads at runtime, zipped
# with manifest.json at the archive's root (required by both stores).
#
# Source list: every git-tracked file, minus developer-only docs
# (CHANGELOG.md, README.md, INSTALL.md — LICENSE is kept),
# public/promotional/ (store-listing screenshots, never referenced by
# any runtime code — confirmed via grep — so they'd only bloat the
# package), .gitignore, .github/ (CI workflows, issue templates —
# none of it part of the extension), and website/ (the project's
# landing page, a separate thing from the extension itself). Using
# `git ls-files` rather than copying the working tree
# wholesale means local scratch files/editor configs are excluded for
# free, without needing their own exclude rule; it also means
# uncommitted edits to tracked files ARE included (this packages
# what's actually on disk right now, not just what's committed).
#
# Usage: scripts/package-extension.sh
# Output: dist/tf2TradingUtils-v<version>.zip

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -pe "require('./manifest.json').version")"
DIST_DIR="$REPO_ROOT/dist"
PACKAGE_NAME="tf2TradingUtils-v$VERSION"
STAGING_DIR="$DIST_DIR/$PACKAGE_NAME"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME.zip"

if [ -n "$(git status --porcelain)" ]; then
  echo "Note: working tree has uncommitted changes — packaging what's on disk right now, not HEAD." >&2
fi

rm -rf "$STAGING_DIR" "$ZIP_PATH"
mkdir -p "$STAGING_DIR"

git ls-files \
  | grep -Ev '(^|/)(CHANGELOG|README|INSTALL)\.md$' \
  | grep -Ev '^public/promotional/' \
  | grep -Ev '^\.gitignore$' \
  | grep -Ev '^\.github/' \
  | grep -Ev '^website/' \
  | while IFS= read -r file; do
      mkdir -p "$STAGING_DIR/$(dirname "$file")"
      cp "$file" "$STAGING_DIR/$file"
    done

(cd "$STAGING_DIR" && zip -qr "$ZIP_PATH" .)
rm -rf "$STAGING_DIR"

FILE_COUNT="$(unzip -l "$ZIP_PATH" | tail -1 | awk '{print $2}')"
echo "Packaged $FILE_COUNT files -> $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"
