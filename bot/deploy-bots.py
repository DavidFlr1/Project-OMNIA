#!/usr/bin/env python3
import json
import subprocess
import sys
import time
from pathlib import Path
import yaml

def load_bot_config():
    """Load bot configuration from bot-config.json"""
    config_path = Path("bot-config.json")
    if not config_path.exists():
        print("❌ bot-config.json not found!")
        sys.exit(1)
    
    with open(config_path) as f:
        return json.load(f)

def get_running_bot_containers():
    """Get list of currently running bot containers"""
    result = subprocess.run([
        "docker", "ps", "--filter", "label=project=mc-bots", 
        "--format", "{{.Names}}"
    ], capture_output=True, text=True)
    
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip().split('\n')
    return []

def stop_containers_not_in_config(config):
    """Stop containers that are no longer in the config (when limit is reduced)"""
    limit = config.get("limit", len(config["bots"]))
    bots_to_keep = config["bots"][:limit]
    expected_containers = {f"{bot['username'].lower()}-{bot['subPort']}" for bot in bots_to_keep}
    
    running_containers = get_running_bot_containers()
    containers_to_stop = [c for c in running_containers if c not in expected_containers]
    
    if containers_to_stop:
        print(f"🛑 Stopping {len(containers_to_stop)} containers no longer in config...")
        for container in containers_to_stop:
            print(f"   Stopping {container}")
            subprocess.run(["docker", "stop", container], capture_output=True)
            subprocess.run(["docker", "rm", container], capture_output=True)

def generate_bot_compose(config):
    """Generate docker-compose.yml for all bots"""
    compose_data = {
        'name': config['deployment']['botGroup'],
        'services': {},
        'networks': {
            'omnia_omnia-network': {
                'external': True
            }
        }
    }
    
    limit = config.get("limit", len(config["bots"]))
    bots_to_start = config["bots"][:limit]
    
    for bot in bots_to_start:
        username = bot["username"]
        sub_port = bot["subPort"]
        password = bot.get("password", "")
        
        api_port = 3000 + sub_port
        logic_port = 4000 + sub_port
        container_name = f"{username.lower()}-{sub_port}"
        
        env = config['environment']
        network = config['deployment']['network']
        environment = [
            f"MINECRAFT_USERNAME={username}",
            f"MINECRAFT_PASSWORD={password}",
            f"AGENT_PORT={api_port}",
            f"LOGIC_PORT={logic_port}",
            f"BOT_HOST=http://0.0.0.0",
            f"SUBPORT={sub_port}",
            f"ENV={env}"
        ]
        
        if env == "local":
            environment.extend([
                f"MINECRAFT_HOST={network}",
                "STORAGE_SERVICE_URL=http://omnia-storage-service-1:8000/api/v1"
            ])
        
        compose_data['services'][container_name] = {
            'build': '.',
            'container_name': container_name,
            'env_file': '../.env',
            'environment': environment,
            'ports': [
                f"{api_port}:{api_port}",
                f"{logic_port}:{logic_port}"
            ],
            'networks': ['omnia_omnia-network'],
            'labels': [
                f'project={config["deployment"]["project"]}',
                f'bot.username={username}',
                f'bot.subport={sub_port}'
            ],
            'command': [
                'npm', 'run', 'dev:combined', '--',
                f'botName={username}',
                f'subPort={sub_port}',
                f'env={env}',
                f"network={network}"
            ]
        }
    
    # Write compose file
    with open('docker-compose.bots.yml', 'w') as f:
        yaml.dump(compose_data, f, default_flow_style=False)
    
    return 'docker-compose.bots.yml'

def deploy_with_behavior(config, compose_file):
    """Deploy bots based on behavior setting"""
    behavior = config['deployment']['behavior']
    wait_time = config['deployment'].get('launchWaitTime', 3000) / 1000  # Convert to seconds
    
    print(f"🎯 Deployment behavior: {behavior}")
    
    if behavior == "destroy":
        print("💥 Destroying all bot containers...")
        subprocess.run(["docker", "compose", "-f", compose_file, "down"], capture_output=True)
        print("✅ All bot containers destroyed")
        return
    
    elif behavior == "overwrite":
        print("🔄 Overwrite mode: Rebuilding all containers...")
        # Stop and remove existing containers
        subprocess.run(["docker", "compose", "-f", compose_file, "down", "--remove-orphans"], capture_output=True)
        
        # Build images
        print("🔨 Building bot images...")
        build_result = subprocess.run(["docker", "compose", "-f", compose_file, "build"])
        if build_result.returncode != 0:
            print("❌ Failed to build bot images")
            sys.exit(1)
        
        # Start all containers with wait time
        print(f"🚀 Starting bot containers (wait time: {wait_time}s between bots)...")
        start_containers_with_delay(config, compose_file, wait_time)
        
    elif behavior == "append":
        print("➕ Append mode: Adding new containers without affecting running ones...")
        
        # Stop containers no longer in config (if limit reduced)
        stop_containers_not_in_config(config)
        
        # Build only new images (docker-compose will skip existing)
        print("🔨 Building new bot images...")
        build_result = subprocess.run(["docker", "compose", "-f", compose_file, "build"])
        if build_result.returncode != 0:
            print("❌ Failed to build bot images")
            sys.exit(1)
        
        # Start only new containers
        print("🚀 Starting new bot containers...")
        start_new_containers_only(config, compose_file, wait_time)
        
    elif behavior == "bot":
        print("🤖 Bot mode: Following individual bot behaviors...")
        deploy_by_individual_bot_behavior(config, compose_file, wait_time)

def start_containers_with_delay(config, compose_file, wait_time):
    """Start containers one by one with delay"""
    limit = config.get("limit", len(config["bots"]))
    bots_to_start = config["bots"][:limit]
    
    if wait_time <= 0:
        # If no wait time, start all at once
        print(f"🚀 Starting all {len(bots_to_start)} bot containers...")
        result = subprocess.run([
            "docker", "compose", "-f", compose_file, "up", "-d"
        ])
        if result.returncode != 0:
            print("❌ Failed to start bot containers")
        return
    
    # Start with delay
    for i, bot in enumerate(bots_to_start):
        container_name = f"{bot['username'].lower()}-{bot['subPort']}"
        print(f"🚀 Starting {container_name} ({i+1}/{len(bots_to_start)})")
        
        result = subprocess.run([
            "docker", "compose", "-f", compose_file, "up", "-d", container_name
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to start {container_name}")
            continue
        else:
            print(f"✅ {container_name} started successfully")
            
        if i < len(bots_to_start) - 1:  # Don't wait after the last bot
            print(f"⏳ Waiting {wait_time}s before next bot...")
            time.sleep(wait_time)

def start_new_containers_only(config, compose_file, wait_time):
    """Start only containers that aren't already running"""
    running_containers = set(get_running_bot_containers())
    limit = config.get("limit", len(config["bots"]))
    bots_to_start = config["bots"][:limit]
    
    new_bots = []
    for bot in bots_to_start:
        container_name = f"{bot['username'].lower()}-{bot['subPort']}"
        if container_name not in running_containers:
            new_bots.append((bot, container_name))
    
    if not new_bots:
        print("✅ No new bots to start")
        return
    
    if wait_time <= 0:
        # Start all new containers at once
        print(f"🚀 Starting {len(new_bots)} new bot containers...")
        container_names = [container_name for _, container_name in new_bots]
        result = subprocess.run([
            "docker", "compose", "-f", compose_file, "up", "-d"
        ] + container_names)
        if result.returncode != 0:
            print("❌ Failed to start new bot containers")
        return
    
    # Start with delay
    print(f"🚀 Starting {len(new_bots)} new bot containers...")
    for i, (bot, container_name) in enumerate(new_bots):
        print(f"🚀 Starting {container_name} ({i+1}/{len(new_bots)})")
        
        result = subprocess.run([
            "docker", "compose", "-f", compose_file, "up", "-d", container_name
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to start {container_name}")
            continue
        else:
            print(f"✅ {container_name} started successfully")
            
        if i < len(new_bots) - 1:
            print(f"⏳ Waiting {wait_time}s before next bot...")
            time.sleep(wait_time)

def deploy_by_individual_bot_behavior(config, compose_file, wait_time):
    """Deploy based on individual bot behavior settings"""
    limit = config.get("limit", len(config["bots"]))
    bots_to_process = config["bots"][:limit]
    running_containers = set(get_running_bot_containers())
    
    for bot in bots_to_process:
        container_name = f"{bot['username'].lower()}-{bot['subPort']}"
        bot_behavior = bot.get('deployment', {}).get('behavior', 'overwrite')
        
        print(f"🤖 Processing {container_name} with behavior: {bot_behavior}")
        
        if bot_behavior == "overwrite":
            # Stop and restart this specific bot
            subprocess.run(["docker", "stop", container_name], capture_output=True)
            subprocess.run(["docker", "rm", container_name], capture_output=True)
            subprocess.run(["docker", "compose", "-f", compose_file, "up", "-d", container_name])
            
        elif bot_behavior == "append" and container_name not in running_containers:
            # Start only if not running
            subprocess.run(["docker", "compose", "-f", compose_file, "up", "-d", container_name])
            
        elif bot_behavior == "destroy":
            # Stop and remove this specific bot
            subprocess.run(["docker", "stop", container_name], capture_output=True)
            subprocess.run(["docker", "rm", container_name], capture_output=True)
            continue
        
        time.sleep(wait_time)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        print("🛑 Stopping all bot containers...")
        subprocess.run(["docker", "compose", "-f", "docker-compose.bots.yml", "down"], capture_output=True)
        print("✅ All bot containers stopped")
        return
    
    # Load configuration
    config = load_bot_config()
    
    # Create network if it doesn't exist
    print("🌐 Creating omnia network...")
    network_result = subprocess.run([
        "docker", "network", "create", 
        "--driver", "bridge",
        "omnia-network"
    ], capture_output=True, text=True)
    
    if network_result.returncode != 0 and "already exists" not in network_result.stderr:
        print(f"❌ Failed to create network: {network_result.stderr}")
        sys.exit(1)
    else:
        print("✅ Omnia network ready")
    
    # Generate compose file
    compose_file = generate_bot_compose(config)
    
    # Deploy based on behavior
    deploy_with_behavior(config, compose_file)
    
    print("✅ Bot deployment completed!")

if __name__ == "__main__":
    main()






