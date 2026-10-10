#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NODE_ENV=development
# Start the frontend in another terminal with pnpm client-dev.
exec pnpm dev
