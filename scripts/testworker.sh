#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

killall -KILL deno

deno run --watch --config ${SCRIPT_DIR}/../frontwork-std/deno.jsonc --allow-net --allow-read ${SCRIPT_DIR}/../frontwork-std/test/test.testworker.ts