#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/../frontwork-std"
FOLDER=$(pwd)
pwd

cmd1="deno run --config deno.jsonc --allow-net --allow-read test/test.service.ts"
cmd2="deno run --config deno.client.jsonc --allow-all test/test.bundle.ts"
last_hash=""

# Function to calculate folder hash
get_folder_hash() {
    find "$FOLDER" -type f -exec md5sum {} \; | sort | md5sum
}

# Function to run commands
run_commands() {
    echo "Changes detected, restarting commands..."
    killall -KILL deno 
    
    # Run new processes
    eval "$cmd1" &
    pid1=$!
    eval "$cmd2" &
    pid2=$!
    
    echo "Started processes with PIDs: $pid1, $pid2"
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