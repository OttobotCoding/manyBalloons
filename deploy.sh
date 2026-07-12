#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Pulling latest changes..."
git pull

echo "==> Rebuilding (no cache) and force-recreating..."
docker compose build --no-cache
docker compose up -d --force-recreate

echo "==> Pruning dangling images..."
docker image prune -f

echo "==> Status:"
docker compose ps

echo "==> Recent app logs:"
docker compose logs --tail=20 app