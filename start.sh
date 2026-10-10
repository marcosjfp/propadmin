#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NODE_ENV=production
if [[ ! -f dist/index.html ]]; then
  echo 'Build first: pnpm build' >&2
  exit 1
fi
exec pnpm start
