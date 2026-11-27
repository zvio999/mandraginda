#!/bin/bash
# Stop the Node app so Passenger loads the code just pulled.
# Match the full command line; cron's plain ps output cuts it off.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="${HOME}/public_html"
STATUS="$WEB/js/update-status.txt"
mkdir -p "$WEB/js" "$ROOT/tmp"
{
  echo "---- $(date) ----"
  command -v pkill || echo "no pkill"
  ps -ww -u "$(whoami)" -o pid=,args= || true
} > "$STATUS" 2>&1
while read -r pid args; do
  case "$args" in
    *server.js*|*bin/node*|*lsnode:*)
      echo "kill $pid $args" >> "$STATUS"
      kill -9 "$pid" >> "$STATUS" 2>&1 || echo "kill failed $pid" >> "$STATUS"
      ;;
  esac
done <<EOF
$(ps -ww -u "$(whoami)" -o pid=,args= 2>/dev/null || true)
EOF
pkill -9 -f '[s]erver.js' >> "$STATUS" 2>&1 || echo "pkill server exit $?" >> "$STATUS"
pkill -9 -f '[l]snode:' >> "$STATUS" 2>&1 || echo "pkill lsnode exit $?" >> "$STATUS"
touch "$ROOT/tmp/restart.txt"
echo "restarted" >> "$STATUS"
