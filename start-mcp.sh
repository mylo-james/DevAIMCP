#!/bin/bash
cd "$(dirname "$0")"
source .env
export DEVAI_SEED_BUILD=ts
exec npx tsx index.ts
