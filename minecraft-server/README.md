# Minecraft Server Project

A containerized Minecraft server using PaperMC 1.21, configured for local Docker development and integrated with the OMNIA bot civilization project.

## Project Overview

This project provides a ready-to-use Minecraft server with:
- PaperMC 1.21 (Java Edition)
- Custom server properties optimized for bot interactions
- Docker deployment
- Plugin support for enhanced gameplay
- Offline mode for bot connections

## Folder Structure

```
minecraft-server/
├── Dockerfile            # Container definition with PaperMC
├── docker-compose.yml    # Local development setup
├── eula.txt              # Minecraft EULA acceptance
├── server.properties     # Server configuration
├── plugins/              # Server plugins
│   ├── SkinsRestorer.jar # Player skin management
│   ├── ImageMaps-1.0.jar # Custom map support
│   ├── InfoHUD-1.5.4.jar # HUD information display
│   └── blockprot-spigot-1.2.5-all.jar # Block protection
├── scripts/
│   ├── entrypoint.sh     # Container startup script
│   └── backup.sh         # World backup utility
├── world/                # Persistent world data
└── misc/                 # Additional server utilities
    └── signs.txt         # Command examples for in-game signs
```

## Server Specifications

- Java 21 runtime
- 4GB memory allocation
- Port: 25565 (default Minecraft port)
- Normal difficulty with hostile mobs disabled
- Offline mode enabled for bot connections
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

Note: The server runs in offline mode to support bot connections from the OMNIA project.

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

## Installed Plugins

- **SkinsRestorer**: Manages player skins in offline mode
- **ImageMaps**: Enables custom map displays
- **InfoHUD**: Provides HUD information to players
- **BlockProt**: Protects blocks from unauthorized modification

## Integration with OMNIA

This server is designed to work with the OMNIA bot civilization project:
- Offline mode allows bots to connect without Mojang authentication
- Peaceful settings (no hostile mobs) create a safe environment for bot learning
- Custom plugins enhance the bot interaction experience

## Configuration Notes

- `online-mode=false`: Enables bot connections
- `spawn-monsters=false`: Disables hostile mobs for peaceful gameplay
- `spawn-animals=true`: Keeps passive mobs for interaction
- `enable-command-block=true`: Allows advanced automation

## Recommended Settings

- Enable F3 + H in-game to see block IDs for bot development
- Use the commands in `misc/signs.txt` to create training areas for bots
