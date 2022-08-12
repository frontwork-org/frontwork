#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

killall -KILL deno

deno run --watch --config ${SCRIPT_DIR}/../deno.jsonc --allow-net --allow-read ${SCRIPT_DIR}/../frontwork-std/test/test.service.ts & 
    deno bundle --watch -c ${SCRIPT_DIR}/../deno.client.jsonc ${SCRIPT_DIR}/../frontwork-std/test/test.client.ts ${SCRIPT_DIR}/../frontwork-std/test/dist/main.js  && fg
