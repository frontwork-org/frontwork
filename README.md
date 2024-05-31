# Frontwork - The TypeScript Framework using Deno & Webassembly

- Create Server-Side Rendering and Client-Side Rendering with the same Typescript code
- Routing System with Domains included
- Deno as server side renderer and assets sender
    - Simple assets sender with the method setup_assets_resolver(assets_dir)
- CLI Tool to create project like ng, and provide CI capabilities like npm

## Getting Started
For getting started you need to install the frontwork-cli tool "frontwork": 

    cargo install frontwork  
And then use `frontwork install` to install required dev-dependencies 

To start a new project you can use `frontwork init` to use the current directory or `frontwork new` to create a new one.

## CLI Tool
| Command | Description |
|--------|--------|
| frontwork install                         | install required dependencies to develop with Frontwork (Deno)   |
| frontwork init                            | create a new project in the current directory |
| frontwork new                             | create a new folder in the current directory and then execute init |
| frontwork component new                   | create a new component |
| frontwork component remove                | remove a component |
| frontwork run                             | run the script of the entered name in package.json |
| frontwork test                            | run main.testworker.ts |
| frontwork build                           | build the application to the dist folder. Optional use: --production or --staging |
| frontwork watch                           | start development server and build the application on changes |

## [Read the Docs](DOCUMENTATION.md) 

## Contribution
### Rust Conventions
We use the rust conventions for rust and typescript code. 
See: https://github.com/rust-lang/rfcs/blob/master/text/0430-finalizing-naming-conventions.md

### help wanted
- Support for multipart/form-data
    - low priority since you can still upload files/blob data through the proxied API

#### Missing iOS and Mac support
To develeop any app for an apple product, MacOS is required to develop and digitaly sign the app. But because I do not own any products of apple, it is not possible for me to develeop for it.   
Still, apple has a market share, thus Frontwork will support apple products in the future.  
If you are interested to support them, then please create a pull request.  