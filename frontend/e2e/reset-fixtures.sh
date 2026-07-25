#!/usr/bin/env bash
# Resets E2E test fixtures against the dev backend so Playwright runs are
# idempotent (the backend enforces one checkin per user per day, so a naive
# re-run without this would 409 on the second run onward).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT/backend"
npx ts-node scripts/e2e-test-cleanup.ts
# e2e-test-seed.ts writes fixtures/data.json itself (not via stdout
# redirection -- importing the Prisma client makes dotenv print banner
# lines to stdout, which would land ahead of the JSON and corrupt the file
# if this script tried to capture it with `>` instead).
npx ts-node scripts/e2e-test-seed.ts
cat "$SCRIPT_DIR/fixtures/data.json"
