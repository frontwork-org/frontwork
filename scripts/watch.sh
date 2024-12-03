#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo ${SCRIPT_DIR}

killall -KILL deno

deno run --watch --config ${SCRIPT_DIR}/../frontwork-std/deno.jsonc --allow-net --allow-read ${SCRIPT_DIR}/../frontwork-std/test/test.service.ts


# deno run --watch --config ${SCRIPT_DIR}/../frontwork-std/deno.jsonc --allow-net --allow-read ${SCRIPT_DIR}/../frontwork-std/test/test.service.ts & fg &
#     deno bundle --watch --config ${SCRIPT_DIR}/../deno.client.jsonc ${SCRIPT_DIR}/../frontwork-std/test/test.client.ts ${SCRIPT_DIR}/../frontwork-std/test/dist/main.js  && fg
