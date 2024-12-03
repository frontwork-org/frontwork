#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


deno compile -c "${SCRIPT_DIR}/../frontwork-std/deno.jsonc" -o "${SCRIPT_DIR}/../frontwork-std/test/std_binary_main_service" --allow-all "${SCRIPT_DIR}/../frontwork-std/test/test.service.ts"


${SCRIPT_DIR}/../frontwork-std/test/std_binary_main_service