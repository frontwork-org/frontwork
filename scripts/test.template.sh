#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

killall -KILL deno

deno run --watch --allow-net --allow-read ${SCRIPT_DIR}/../frontwork-cli/template/test.testworker.ts