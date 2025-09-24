#!/usr/bin/env python3
import json
import subprocess
import sys
import time
from pathlib import Path

def load_bot_config():
    """Load bot configuration from bot-config.json"""
    config_path = Path("bot-config.json")
    if not config_path.exists():
        print("❌ bot-config.json not found!")
        sys.exit(1)
    
    with open(config_path) as f:
        return json.load(f)

def create_bot_container(bot, config):
    """Create and start a single bot container"""
    username = bot["username"]
    sub_port = bot["subPort"]
    password = bot.get("password", "")
    
    api_port = 3000 + sub_port
    logic_port = 4000 + sub_port
    
    container_name = f"minecraft-bot-{username.lower()}"
    
    # Stop and remove existing container if it exists
    print(f"🧹 Cleaning up existing container: {container_name}")
    subprocess.run(["docker", "stop", container_name], capture_output=True)
    subprocess.run(["docker", "rm", container_name], capture_output=True)
    
    print(f"🤖 Starting bot: {username} on port {sub_port} (API:{api_port}, Logic:{logic_port}) env={config['environment']}")
    
    # Determine network and minecraft host based on environment
    env = config['environment']
    if env == "local":
        # For local: connect to local minecraft server container
        network_args = ["--network", "minecraft-server_minecraft-network"]
        minecraft_host_override = ["-e", "MINECRAFT_HOST=minecraft-server-mc-1"]
    else:
        # For dev/prod: use external IP from .env
        network_args = ["--network", "bot-network"]
        minecraft_host_override = []
    
    # Docker run command with custom parameters
    cmd = [
        "docker", "run", "-d",
        "--name", container_name,
        "--env-file", "../.env",
        "-e", f"MINECRAFT_USERNAME={username}",
        "-e", f"MINECRAFT_PASSWORD={password}",
        "-e", f"AGENT_PORT={api_port}",
        "-e", f"LOGIC_PORT={logic_port}",
        "-e", f"BOT_HOST=http://0.0.0.0",
        "-e", f"SUBPORT={sub_port}",
        "-e", f"ENV={env}",
        *minecraft_host_override,
        "-p", f"{api_port}:{api_port}",
        "-p", f"{logic_port}:{logic_port}",
        *network_args,
        "minecraft-bot:latest",
        "npm", "run", "dev:combined", "--",
        f"botName={username}",
        f"subPort={sub_port}",
        f"env={env}"
        f"network={minecraft_host_override[1]}"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Bot {username} started successfully")
            return container_name
        else:
            print(f"❌ Failed to start bot {username}: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error starting bot {username}: {e}")
        return None

def stop_all_bots():
    """Stop and remove all bot containers"""
    print("🛑 Stopping all bot containers...")
    
    # Get all containers with minecraft-bot prefix
    result = subprocess.run(
        ["docker", "ps", "-a", "--filter", "name=minecraft-bot-", "--format", "{{.Names}}"],
        capture_output=True, text=True
    )
    
    if result.returncode == 0 and result.stdout.strip():
        containers = result.stdout.strip().split('\n')
        for container in containers:
            print(f"🛑 Stopping {container}")
            subprocess.run(["docker", "stop", container], capture_output=True)
            subprocess.run(["docker", "rm", container], capture_output=True)
    
    print("✅ All bot containers stopped")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        stop_all_bots()
        return
    
    # Load configuration
    config = load_bot_config()
    
    # Create network if it doesn't exist (with error handling)
    print("🌐 Creating bot network...")
    network_result = subprocess.run([
        "docker", "network", "create", 
        "--driver", "bridge",
        "--subnet", "172.20.0.0/16",
        "--gateway", "172.20.0.1",
        "bot-network"
    ], capture_output=True, text=True)
    
    if network_result.returncode != 0 and "already exists" not in network_result.stderr:
        print(f"❌ Failed to create network: {network_result.stderr}")
        sys.exit(1)
    else:
        print("✅ Network ready")
    
    # Build the image first
    print("🔨 Building bot image...")
    build_result = subprocess.run(["docker", "build", "-t", "minecraft-bot:latest", "."])
    if build_result.returncode != 0:
        print("❌ Failed to build bot image")
        sys.exit(1)
    
    # Start bots
    limit = config.get("limit", len(config["bots"]))
    bots_to_start = config["bots"][:limit]
    wait_time = config.get("launchWaitTime", 5000) / 1000  # Convert to seconds
    
    print(f"🚀 Starting {len(bots_to_start)} bots...")
    
    started_containers = []
    for i, bot in enumerate(bots_to_start):
        if i > 0:
            print(f"⏳ Waiting {wait_time}s before starting next bot...")
            time.sleep(wait_time)
        
        container = create_bot_container(bot, config)
        if container:
            started_containers.append(container)
    
    print(f"✅ Started {len(started_containers)} bot containers")
    print("\n📊 Bot Status:")
    for i, bot in enumerate(bots_to_start[:len(started_containers)]):
        api_port = 3000 + bot["subPort"]
        logic_port = 4000 + bot["subPort"]
        print(f"  • {bot['username']}: API http://localhost:{api_port}, Logic http://localhost:{logic_port}")

if __name__ == "__main__":
    main()




