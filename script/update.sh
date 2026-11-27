#!/bin/bash
export PATH="/usr/local/cpanel/3rdparty/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
mkdir -p "$ROOT/tmp"
exec >>"$ROOT/tmp/update.log" 2>&1
echo "---- $(date) ----"

git fetch origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" = "$REMOTE" ] && [ "$1" != "--force" ]; then
  echo "already $LOCAL"
  exit 0
fi

# Run the restart from a second script so git reset cannot cut it off.
bash "$ROOT/script/restart.sh" || true

LOCK_BEFORE="$(git rev-parse "HEAD:package-lock.json" 2>/dev/null || true)"
git reset --hard origin/main
LOCK_AFTER="$(git rev-parse "HEAD:package-lock.json" 2>/dev/null || true)"

WEB="$HOME/public_html"
mkdir -p "$WEB/css" "$WEB/js" "$WEB/media"
cp -a public/css/. "$WEB/css/"
cp -a public/js/. "$WEB/js/"
cp -a public/media/. "$WEB/media/"
touch "$ROOT/tmp/restart.txt"

if [ "$LOCK_BEFORE" != "$LOCK_AFTER" ]; then
  ACTIVATE="$(echo "$HOME"/nodevenv/home2/mandragi/mandraginda/*/bin/activate | awk '{print $1}')"
  if [ -f "$ACTIVATE" ]; then
    # shellcheck disable=SC1090
    . "$ACTIVATE"
    npm install --omit=dev
  fi
fi

echo "updated to $(git rev-parse --short HEAD)"
