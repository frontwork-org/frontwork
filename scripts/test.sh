#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

deno run --config ${SCRIPT_DIR}/../frontwork-std/deno.client.jsonc --allow-all ${SCRIPT_DIR}/../frontwork-std/test/test.bundle.ts

