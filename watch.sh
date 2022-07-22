#!/bin/bash

deno run --watch --config ./deno.jsonc --allow-net --allow-read frontwork-std/test/test.service.ts & 
    deno bundle --watch -c deno.bundler.jsonc ./frontwork-std/test/test.front.ts ./frontwork-std/test/dist/main.front.bundle.js &
    npx esbuild --watch ./frontwork-std/test/dist/main.front.bundle.js --bundle --outfile=./frontwork-std/test/dist/main.js && fg
