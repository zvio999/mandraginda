#!/bin/bash
# Stop LiteSpeed's node process so it loads the code just pulled.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -f "${HOME}/public_html/js/update-status.txt"
while read -r pid args; do
  case "$args" in
    *server.js*|*bin/node*|*lsnode:*)
      echo "kill $pid"
      kill -9 "$pid" || echo "kill failed $pid"
      ;;
  esac
done <<EOF
$(ps -ww -u "$(whoami)" -o pid=,args= 2>/dev/null || true)
EOF
pkill -9 -f '[l]snode:' || true
touch "$ROOT/tmp/restart.txt"
echo "restarted"
