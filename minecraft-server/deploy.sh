#!/bin/bash
set -e

echo "🚀 Deploying Minecraft Server..."

# Stop existing containers first
docker compose -f docker-compose.prod.yml down

# Stash any local changes (runtime files)
git stash push -m "Runtime files backup $(date)"

# Pull latest changes
git pull origin main

# Rebuild and start
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ Minecraft Server deployed successfully!"
echo "📊 Check status: docker compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker compose -f docker-compose.prod.yml logs -f"
