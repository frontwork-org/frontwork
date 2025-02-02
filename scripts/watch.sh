#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/../frontwork-std"
FOLDER=$(pwd)
pwd

cmd="deno run --config deno.jsonc --allow-net --allow-read test/test.service.ts"
last_hash=""
pid=""

# Function to calculate folder hash
get_folder_hash() {
    find "$FOLDER" -type f -exec md5sum {} \; | sort | md5sum
}

# Function to run commands
run_commands() {
    echo "Changes detected, restarting commands..."
    # killall -KILL deno
    if [ "$pid" != "" ]; then
        echo "Kill old service: $pid"
        kill "$pid"
    fi
    
    # Create new client before running service
    deno run --config deno.client.jsonc --allow-all test/test.bundle.ts

    # Run new service
    eval "$cmd" &
    echo ""

    pid=$(lsof -i:8080 | grep -i deno | awk '{print $2}')
    echo "Started service with PID: $pid"
}

# Initial run
current_hash=$(get_folder_hash)
last_hash=$current_hash
run_commands

echo "Watching folder: $FOLDER"

# Watch loop
while true; do
    current_hash=$(get_folder_hash)
    
    if [ "$current_hash" != "$last_hash" ]; then
        run_commands
        last_hash=$current_hash
    fi
    
    sleep 1
done