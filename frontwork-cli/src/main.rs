use std::{env, fs};
use std::path::Path;
use std::process;
use include_dir::{include_dir, Dir};


static PROJECT_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/template/");


fn print_help(had_error: bool, error_message: &str) {
    match had_error {
        false => {
            println!("FrontWork by LuceusXylian <luceusxylian@gmail.com> and frontwork-org <https://github.com/frontwork-org> Contributors");
            println!("-- The TypeScript Framework using Deno & Webassembly --");
            println!("\n Usage:");
        },
        true => {
            println!("The usage of arguments has been entered wrong because {}. \nPlease follow the following usage:", error_message);
        }
    }
    println!("  -h or --help                    | this help message");
    println!("  install                         | install required dependencies");
    println!("  init                            | create a new project in the current directory");
    println!("  new                             | create a new folder in the current directory and then execute init");
}

#[derive(PartialEq)]
pub enum SubCommand {
    Install,
    Init,
    New,
    //TODO: Add component subcommands
}

pub enum Flag {
    Default
}

struct Arguments {
    subcomand: SubCommand,
    projectname: Option<String>,
    _flag: Flag,
}

impl Arguments {
    fn new(args: &[String]) -> Result<Arguments, &'static str> {
        if args.len() < 2 {
            return Err("no arguments have been entered");
        }

        if args.contains(&"-h".to_string()) || args.contains(&"--help".to_string()) {
            print_help(false, "");
            return Err("")
        } else {
            let subcommand: SubCommand = match args[1].as_str() {
                "install" => SubCommand::Install,
                "init" => SubCommand::Init,
                "new" => SubCommand::New,
                _ => return Err("the entered subcommand is not valid")
            };
            let flag: Flag = Flag::Default;

            let projectname: Option<String> = if subcommand == SubCommand::New {
                if args.len() < 3 {
                    return Err("no projectname has been entered")
                }
                Some(args[2].clone())
            } else {
                None
            };

            return Ok(Arguments {
                subcomand: subcommand,
                projectname: projectname,
                _flag: flag
            });
        }

        //return Err("of invalid syntax")
    }
}

/*
fn request(url: &str) -> Result<reqwest::blocking::Response, ()> {
    let client_builder = reqwest::blocking::Client::builder().build();
    let client; 
    match client_builder {
        Ok(c) => client = c, Err(e) => {
            println!("Request failed. \n{}", e);
            return Err(())
        }
    }

    if let Ok(response) = client.get(url).send() {
        Ok(response)
    } else {
        Err(())
    }
}
*/

fn main() {
    let args: Vec<String> = env::args().collect();
    let arguments = Arguments::new(&args).unwrap_or_else(
        |err| {
            if err == "" {
                process::exit(0);
            } else {
                print_help(true, err);
                process::exit(1);
            }
        }
    );

    // let homedir = env::var("HOME").unwrap();

    match arguments.subcomand {
        SubCommand::Install => {
            println!("GET & INSTALL: Deno");
            let (_, output, _) = run_script::run_script!(
                r#"
                    #!/bin/sh
                    # Copyright 2019 the Deno authors. All rights reserved. MIT license.
                    
                    set -e
                    
                    if ! command -v unzip >/dev/null; then
                        echo "Error: unzip is required to install Deno (see: https://github.com/denoland/deno_install#unzip-is-required)." 1>&2
                        exit 1
                    fi
                    
                    if [ "$OS" = "Windows_NT" ]; then
                        target="x86_64-pc-windows-msvc"
                    else
                        case $(uname -sm) in
                        "Darwin x86_64") target="x86_64-apple-darwin" ;;
                        "Darwin arm64") target="aarch64-apple-darwin" ;;
                        *) target="x86_64-unknown-linux-gnu" ;;
                        esac
                    fi
                    
                    if [ $# -eq 0 ]; then
                        deno_uri="https://github.com/denoland/deno/releases/latest/download/deno-${target}.zip"
                    else
                        deno_uri="https://github.com/denoland/deno/releases/download/${1}/deno-${target}.zip"
                    fi
                    
                    deno_install="${DENO_INSTALL:-$HOME/.deno}"
                    bin_dir="$deno_install/bin"
                    exe="$bin_dir/deno"
                    
                    if [ ! -d "$bin_dir" ]; then
                        mkdir -p "$bin_dir"
                    fi
                    
                    curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"
                    unzip -d "$bin_dir" -o "$exe.zip"
                    chmod +x "$exe"
                    rm "$exe.zip"
                    
                    echo "Deno was installed successfully to $exe"
                    if command -v deno >/dev/null; then
                        echo "Run 'deno --help' to get started"
                    else
                        case $SHELL in
                        /bin/zsh) shell_profile=".zshrc" ;;
                        *) shell_profile=".bash_profile" ;;
                        esac
                        echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
                        echo "  export DENO_INSTALL=\"$deno_install\""
                        echo "  export PATH=\"\$DENO_INSTALL/bin:\$PATH\""
                        echo "Run '$exe --help' to get started"
                    fi
                "#
            )
            .unwrap();
        
            println!("{}", output);
        }

        SubCommand::Init | SubCommand::New => {
            let projectpath= if arguments.subcomand == SubCommand::New {
                // try to create folder with the name of the project
                let projectname = arguments.projectname.unwrap();
                let projectpath_local = format!("{}/{}", env::current_dir().unwrap().to_str().unwrap(), projectname);
                if Path::new(&projectpath_local).exists() {
                    println!("The projectname has been used. Please use another name.");
                    process::exit(1);
                } else {
                    fs::create_dir_all(&projectpath_local).unwrap();
                    projectpath_local
                }
            } else {
                env::current_dir().unwrap().to_str().unwrap().to_string()
            };

            // https://docs.rs/include_dir/latest/include_dir/
            if let Ok(_) = PROJECT_DIR.extract(&projectpath) {
                println!("The project has been initialized successfully.");
            } else {
                println!("The project initialisation failed.");
            }

        }

    }

}
