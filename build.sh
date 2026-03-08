#!/bin/bash
# Build script for WebGuard — produces browser-specific builds

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist"

echo "Building WebGuard..."

# Clean dist
rm -rf "$DIST_DIR/chrome" "$DIST_DIR/firefox"
mkdir -p "$DIST_DIR/chrome" "$DIST_DIR/firefox"

# Chrome build
echo "  Chrome build..."
cp -r "$PROJECT_DIR/src" "$DIST_DIR/chrome/src"
cp -r "$PROJECT_DIR/vendor" "$DIST_DIR/chrome/vendor"
cp "$PROJECT_DIR/manifest.chrome.json" "$DIST_DIR/chrome/manifest.json"

# Firefox build
echo "  Firefox build..."
cp -r "$PROJECT_DIR/src" "$DIST_DIR/firefox/src"
cp -r "$PROJECT_DIR/vendor" "$DIST_DIR/firefox/vendor"
cp "$PROJECT_DIR/manifest.firefox.json" "$DIST_DIR/firefox/manifest.json"

echo "Done! Load from:"
echo "  Chrome:  $DIST_DIR/chrome"
echo "  Firefox: $DIST_DIR/firefox"
