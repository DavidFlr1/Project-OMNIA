#!/bin/bash
set -e

echo "🚀 Start: Deploying Minecraft Server..."

# Stop existing containers first
docker compose -f docker-compose.prod.yml down

# Force stash all changes including untracked files
git add -A
git stash push -u -m "Runtime files backup $(date)"

# Reset any remaining conflicts
git reset --hard HEAD

# Pull latest changes
git pull origin main

# Rebuild and start
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ Minecraft Server deployed successfully!"
echo "📊 Check status: docker compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker compose -f docker-compose.prod.yml logs -f"
