#!/bin/bash
# Safe gh-pages deployment — uses a temporary worktree so the main working
# directory and running dev server are NEVER touched.
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEPLOY_DIR="$ROOT/.gh-pages-deploy"

echo "==> Building..."
cd "$ROOT"
./node_modules/.bin/vite build

echo "==> Deploying to gh-pages via worktree..."
# Remove stale worktree if it exists
git worktree remove "$DEPLOY_DIR" 2>/dev/null || true
rm -rf "$DEPLOY_DIR"

# Create a fresh worktree from the gh-pages branch (or create it)
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$DEPLOY_DIR" gh-pages
else
  git worktree add --orphan "$DEPLOY_DIR"
fi

# Clean the worktree and copy dist files
cd "$DEPLOY_DIR"
git rm -rf --ignore-unmatch . 2>/dev/null || true
rm -rf ./* 2>/dev/null || true
cp -r "$ROOT/dist"/* .

git add -A
git commit -m "deploy: $(date +%Y-%m-%d)" || echo "(no changes to commit)"
git push origin gh-pages

# Cleanup
cd "$ROOT"
git worktree remove "$DEPLOY_DIR"

echo "==> Done. Dev server at localhost:5173 was never touched."
