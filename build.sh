#!/usr/bin/env bash
# WorkTrack Build Script
# Usage: bash build.sh [dev|dist|server]

set -e

MODE=${1:-dist}
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo " WorkTrack Build — mode: $MODE"
echo "============================================"

check_node() {
  if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js not found. Install v18+ from https://nodejs.org"
    exit 1
  fi
  echo "OK: Node $(node --version)"
}

install_deps() {
  echo ""
  echo "[1/4] Root dependencies..."
  cd "$ROOT" && npm install

  echo "[2/4] Renderer..."
  cd "$ROOT/renderer" && npm install

  echo "[3/4] Admin dashboard..."
  cd "$ROOT/admin-dashboard" && npm install

  echo "[4/4] Admin server..."
  cd "$ROOT/admin-server" && npm install

  echo ""
  echo "Rebuilding native modules..."
  cd "$ROOT" && npx electron-rebuild -f -w better-sqlite3
}

build_renderer() {
  echo "Building renderer..."
  cd "$ROOT/renderer" && npm run build
}

build_admin() {
  echo "Building admin dashboard..."
  cd "$ROOT/admin-dashboard" && npm run build
}

case "$MODE" in
  install)
    check_node
    install_deps
    echo "Done. Run: bash build.sh dist"
    ;;

  dev)
    check_node
    cd "$ROOT"
    npm run start
    ;;

  dist)
    check_node
    build_renderer
    build_admin
    cd "$ROOT"
    echo "Running electron-builder..."
    npx electron-builder --win
    echo ""
    echo "Installer ready in: $ROOT/dist/"
    ls -lh "$ROOT/dist/"*.exe 2>/dev/null || true
    ;;

  server)
    echo "Starting admin server..."
    cd "$ROOT/admin-server"
    if [ ! -f .env ]; then
      cp .env.example .env
      echo "Created .env from .env.example — edit it before production use."
    fi
    node server.js
    ;;

  *)
    echo "Usage: bash build.sh [install|dev|dist|server]"
    exit 1
    ;;
esac
