# Minecraft Server Project

A containerized Minecraft server using PaperMC 1.21, configured for both local Docker development and Kubernetes deployment.

## Project Overview

This project provides a ready-to-use Minecraft server with:
- PaperMC 1.21 (Java Edition)
- Custom server properties and configurations
- Docker and Kubernetes deployment options
- Automated world backups

## Folder Structure

```
minecraft-server/
├── Dockerfile            # Container definition with PaperMC
├── docker-compose.yml    # Local development setup
├── eula.txt              # Minecraft EULA acceptance
├── server.properties     # Server configuration
├── plugins/              # Server plugins
│   └── PeacefulButHarsh.jar  # Custom gameplay modifications
├── scripts/
│   ├── entrypoint.sh     # Container startup script
│   └── backup.sh         # World backup utility
├── k8s/                  # Kubernetes deployment files
│   ├── minecraft-deployment.yaml
│   └── world-backup-cronjob.yaml
└── world/                # Persistent world data
```

## Server Specifications

- Java 21 runtime
- 4GB memory allocation
- Port: 25565 (default Minecraft port)
- Peaceful gameplay (no hostile mobs) with normal difficulty
- Persistent world storage

## Getting Started

### Build and Start the Server (First Time or Reset)

```bash
docker compose up --build
```

### Start the Server (After First Build)

```bash
docker compose up
```

### Run in Background

```bash
docker compose up -d
```

### Stop the Server

```bash
docker compose down
```

### Restart the Server

```bash
docker compose restart
```

## Connecting to the Server

Connect using Minecraft Java Edition:
1. Open Minecraft
2. Select "Multiplayer"
3. Add Server with address: `localhost:25565`

## Server Administration

### Access Server Console

```bash
docker attach minecraft-server-mc-1
```
Press Ctrl+P, Ctrl+Q to detach without stopping the container.

### Add Admin Privileges

Method 1: Using console
```
op username
```

Method 2: Edit `world/ops.json` file and restart the server
```json
[
  {
    // for offline mode check the log uuid generated to add it into the ops.json
    "uuid": "player-uuid-here", 
    "name": "playerName",
    "level": 4,
    "bypassesPlayerLimit": false
  }
]
```

Permission levels:
- Level 1: Moderator (basic commands)
- Level 2: Gamemaster (more game control)
- Level 3: Admin (server control)
- Level 4: Owner (complete access)

## Kubernetes Deployment

For production deployment, use the Kubernetes manifests in the `k8s/` directory.

```bash
kubectl apply -f k8s/
```

## Backups

Automated hourly backups are configured in Kubernetes using a CronJob that saves world data to Google Cloud Storage.
