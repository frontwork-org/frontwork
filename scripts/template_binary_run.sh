#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


deno compile -c "${SCRIPT_DIR}/../frontwork-cli/template/deno.jsonc" -o "${SCRIPT_DIR}/../frontwork-cli/template/dist/production-web/template_binary_main_service" --allow-all "${SCRIPT_DIR}/../frontwork-cli/template/src/main.service.ts"


${SCRIPT_DIR}/../frontwork-cli/template/dist/production-web/template_binary_main_service