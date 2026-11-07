#!/bin/bash
# GitHub 设备授权轮询：拿到 token 后写入 /tmp/gh-token.txt 并登录 gh
DC="a38cc9b921246d6e5d1ae932a858e8351d2be531"
CLIENT="178c6fc778ccc68e1d6a"
LOG=/tmp/gh-poll.log
: > "$LOG"
for i in $(seq 1 150); do
  R=$(curl -s -m 20 -X POST https://github.com/login/oauth/access_token \
      -H "Accept: application/json" -H "User-Agent: gh-cli" \
      --data-urlencode "client_id=$CLIENT" \
      --data-urlencode "device_code=$DC" \
      --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:device_code")
  echo "$(date +%H:%M:%S) $R" >> "$LOG"
  TOKEN=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('access_token','') or '')" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    printf '%s' "$TOKEN" > /tmp/gh-token.txt
    echo "GOT_TOKEN $(date +%H:%M:%S)" >> "$LOG"
    echo "$TOKEN" | gh auth login --with-token >> "$LOG" 2>&1
    echo "GH_LOGIN_DONE $(date +%H:%M:%S)" >> "$LOG"
    exit 0
  fi
  sleep 6
done
echo "EXPIRED $(date +%H:%M:%S)" >> "$LOG"
