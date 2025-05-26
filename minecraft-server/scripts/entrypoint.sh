#!/bin/bash
set -e

# ❶ Ensure EULA accepted
grep -q "eula=true" /data/eula.txt || echo "eula=true" > /data/eula.txt

# ❷ Start server with good GC flags
exec java -Xms$MEMORY -Xmx$MEMORY -jar /papermc.jar --nogui
