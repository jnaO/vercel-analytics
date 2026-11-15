#!/usr/bin/env bash
# Pre-commit gate: run via `pnpm check:staged` before every commit.
# Holds patterns only, never a value.
set -u

files=$(git diff --cached --name-only --diff-filter=ACMR)

echo "Staged files:"
if [ -z "$files" ]; then
  echo "  (none)"
  exit 0
fi
echo "$files" | sed 's/^/  /'

fail=0

while IFS= read -r path; do
  case "$path" in
    .env.example | */.env.example) ;;
    .env* | */.env*)
      echo "BLOCKED env file: $path"
      fail=1
      ;;
  esac
  case "$path" in
    .vercel/* | */.vercel/* | .claude/* | .agent-docs/* | .qa/* | graphify-out/* | \
      CLAUDE.md | AGENTS.md | ARCHITECTURE.md)
      echo "BLOCKED agent/local file: $path"
      fail=1
      ;;
  esac
done <<EOF
$files
EOF

added=$(git diff --cached -U0 --diff-filter=ACMR | grep -E '^\+' | grep -vE '^\+\+\+ ')

check() {
  local label=$1 pattern=$2
  if echo "$added" | grep -qiE -- "$pattern"; then
    echo "BLOCKED added line looks like a credential ($label); matching lines:"
    echo "$added" | grep -iE -- "$pattern" | cut -c1-60 | sed 's/^/  /'
    fail=1
  fi
}

check "Upstash REST hostname" '[a-z0-9-]+\.upstash\.io'
check "Bearer literal" 'bearer[[:space:]]+[A-Za-z0-9._~+/=-]{16,}'
check "token/secret/password assignment" "(token|secret|password)[A-Za-z0-9_]*[\"']?[[:space:]]*[:=][[:space:]]*[\"'][^\"'[:space:]]{20,}[\"']"

if [ "$fail" -ne 0 ]; then
  echo "check:staged FAILED"
  exit 1
fi
echo "check:staged OK"
