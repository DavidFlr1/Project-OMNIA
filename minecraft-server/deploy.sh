#!/bin/bash
set -e

echo "🚀 Deploying Minecraft Server..."

# Pull latest changes
git pull origin main

# Stop existing containers
docker compose -f docker-compose.prod.yml down

# Rebuild and start
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ Minecraft Server deployed successfully!"
echo "📊 Check status: docker compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker compose -f docker-compose.prod.yml logs -f"