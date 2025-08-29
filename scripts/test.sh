#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR


CURRENT_VERSION="0.1.31"
DENO_LOCK_FILE="../frontwork-cli/template/deno.lock"

# Array of files to check
FILES=(
    "dom.ts"
    "frontwork-client.ts"
    "frontwork-service.ts"
    "frontwork-testworker.ts"
    "frontwork-bundler.ts"
    "frontwork.ts"
    "lib.ts"
    "utils.ts"
)

# First remove old version entries
for file in "${FILES[@]}"; do
    sed -i "/frontwork@${CURRENT_VERSION}\/${file}/d" "$DENO_LOCK_FILE"
done

# Remove trailing comma
sed -i ':a;N;$!ba;s/,\n  }\n}/\n  }\n}/g' "$DENO_LOCK_FILE"

# Reload cache
deno cache --reload --lock=deno.lock src/main.testworker.ts
deno cache --reload --lock=deno.lock src/main.client.ts


echo "deno.lock has been updated with new versions and integrity hashes"