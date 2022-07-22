# Frontwork - The TypeScript Framework using Deno & Webassembly

- Deno as server side renderer and assets sender
- Wasmer as runtime for desktop and android
- CLI Tool to create project like ng, and provide CI capabilities like npm
- Yarn as package manager
- esbuild as bundler. required to share libraries between apps


## CLI Tool
1. fontwork-cli install // install Deno and Wasmer

## [Read the Docs](DOCUMENTATION.md) 

## Contribution
### Rust Conventions
We use the rust conventions for rust and typescript code. 
See: https://github.com/rust-lang/rfcs/blob/master/text/0430-finalizing-naming-conventions.md

### help wanted
- Support for multipart/form-data
    - low priority since you can still upload files/blob data through the proxied API