use std::io::{Write, Read};
use std::{env, fs};
use std::path::Path;
use std::process::{self, Command};
use include_dir::{include_dir, Dir};
use convert_case::{Case, Casing};
use package_json::PackageJson;
use utils::{run_command, create_dir_all_verbose};

use crate::utils::read_from_line;
mod utils;
mod package_json;

static PROJECT_TEMPLATE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/template/");


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
    println!("  component new                   | create a new component");
    println!("  component remove                | remove a component");
}

#[derive(PartialEq)]
pub enum SubCommand {
    Install,
    Init,
    New,
    Component,
    Run,
    Test,
    Build,
    Watch,
}

pub enum Flag {
    Default,
    New,
    Remove,
}

struct Arguments {
    subcomand: SubCommand,
    input: Option<String>,
    flag: Flag,
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
                "component" => SubCommand::Component,
                "run" => SubCommand::Run,
                "test" => SubCommand::Test,
                "build" => SubCommand::Build,
                "watch" => SubCommand::Watch,
                _ => return Err("the entered subcommand is not valid")
            };

            let flag: Flag = if subcommand == SubCommand::Component {
                if args.len() < 3 {
                    return Err("the entered subcommand is not valid")
                }

                match args[2].as_str() {
                    "new" => Flag::New,
                    "remove" => Flag::Remove,
                    _ => return Err("the entered subcommand is not valid")
                }
            } else {
                Flag::Default
            };


            let input: Option<String> = if subcommand == SubCommand::New {
                if args.len() < 3 {
                    Some(read_from_line("Please enter a name for the new project: "))
                } else {
                    Some(args[2].clone())
                }
            } else if subcommand == SubCommand::Run {
                if args.len() < 3 {
                    Some(read_from_line("Please enter the name of the script to run: "))
                } else {
                    Some(args[2].clone())
                }
            } else if subcommand == SubCommand::Component {
                if args.len() < 4 {
                    Some(read_from_line("Please enter the name for the component: "))
                } else {
                    Some(args[3].clone())
                }
            } else {
                None
            };

            return Ok(Arguments {
                subcomand: subcommand,
                flag,
                input,
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
            let project_path= if arguments.subcomand == SubCommand::New {
                // try to create folder with the name of the project
                let projectname = arguments.input.unwrap();
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
            if let Ok(_) = PROJECT_TEMPLATE_DIR.extract(&project_path) {
                println!("The project has been initialized successfully.");
            } else {
                println!("The project initialisation failed.");
            }

        }

        SubCommand::Component => {
            // Sanity check: Is the project initialized && does ./src/components exist?
            let project_path = get_project_path();
            let components_path = format!("{}/src/components", project_path);

            let componentname = arguments.input.unwrap().to_case(Case::Snake);
            let componentname_uppercamelcase = componentname.to_case(Case::UpperCamel);
            let componentname_classname = format!("{}Component", componentname_uppercamelcase);
            let componentpath = format!("{}/{}", components_path, componentname);
            let global_style_file_path = format!("{}/src/style.scss", project_path);
            let global_style_content = format!("\n@import './components/{}.scss';", componentname);
            let routes_file_path = format!("{}/src/components/routes.ts", project_path);
            let component_import_statement = format!("import {{ {} }} from \"./{}/{}.ts\";", componentname_classname, componentname, componentname);


            match arguments.flag {
                Flag::New => {
                    // Create the component
                    if Path::new(&componentpath).exists() {
                        println!("The componentname has been used. Please use another name.");
                        process::exit(1);
                    } else {
                        fs::create_dir_all(&componentpath).unwrap();

                        let mut ts_file_content = String::new();
                        ts_file_content.push_str("import { Component, FrontworkContext, DocumentBuilder, FrontworkResponse, FrontworkClient } from \"../../dependencies.ts\";\n\n\n");
                        ts_file_content.push_str(&format!("export class {} implements Component {{\n", componentname_classname));
                        ts_file_content.push_str("    build(context: FrontworkContext) {\n");
                        ts_file_content.push_str("        const document_builder = new DocumentBuilder();\n");
                        ts_file_content.push_str(&format!("        let title = '{}';\n", componentname_uppercamelcase));
                        ts_file_content.push_str(&format!("        let description = '{}';\n", componentname_uppercamelcase));
                        ts_file_content.push_str("        \n");
                        ts_file_content.push_str("        return new FrontworkResponse(200, \n");
                        ts_file_content.push_str("            document_builder\n");
                        ts_file_content.push_str("                .set_html_lang(context.i18n.selected_locale.locale)\n");
                        ts_file_content.push_str("                .add_head_meta_data(title, description, \"index,follow\")\n");
                        ts_file_content.push_str("        );\n");
                        ts_file_content.push_str("    }\n\n");
                        ts_file_content.push_str("    dom_ready(context: FrontworkContext, frontwork: FrontworkClient) {\n        \n  }\n");
                        ts_file_content.push_str("}\n");
                            

                        fs::write(Path::new(&format!("{}/{}.ts", componentpath, componentname)), ts_file_content).expect("Unable to write file");
                        fs::write(Path::new(&format!("{}/{}.scss", componentpath, componentname)), "").expect("Unable to write file");

                        // open routes.ts and add the import statement
                        let mut routes_file_content = String::new();
                        routes_file_content.push_str(&component_import_statement);
                        routes_file_content.push_str("\n");
                        routes_file_content += fs::read_to_string(Path::new(&routes_file_path)).expect(&format!("Can not open routes.ts  \"{}\"", routes_file_path)).as_str();
                        fs::write(Path::new(&routes_file_path), routes_file_content).expect(&format!("Unable to write routes.ts  \"{}\"", routes_file_path));
                        

                        // add the new created component to style.scss
                        let global_style_file = fs::OpenOptions::new()
                            .write(true)
                            .append(true)
                            .open(&global_style_file_path);

                        match global_style_file {
                            Ok(mut global_style_file ) => {
                                global_style_file.write_all(global_style_content.as_bytes()).expect("Unable to write file");
                                println!("The component has been created successfully.");
                            },
                            Err(error) => {
                                println!("{}", error);
                                println!("Unable to open '{}'. The project may not be initialized.", &global_style_file_path);
                                process::exit(1);
                            }
                        }
                    }
                },
                Flag::Remove => {
                    // Delete the component
                    if Path::new(&componentpath).exists() {
                        fs::remove_dir_all(&componentpath).unwrap();

                        let mut routes_file_content = String::new();
                        fs::read_to_string(Path::new(&routes_file_path)).expect(&format!("Can not open routes.ts  \"{}\"", routes_file_path)).lines().for_each(|line| {
                            if line != component_import_statement {
                                routes_file_content.push_str(line);
                                routes_file_content.push_str("\n");
                            }
                        });
                        fs::write(Path::new(&routes_file_path), routes_file_content).expect(&format!("Unable to write routes.ts  \"{}\"", routes_file_path));


                        // remove the component from style.scss
                        let global_style_file = fs::OpenOptions::new()
                            .read(true)
                            .open(&global_style_file_path);
                        
                        match global_style_file {
                            Ok(mut global_style_file ) => {
                                let mut content = String::new();
                                global_style_file.read_to_string(&mut content).unwrap();
                                content = content.replace(global_style_content.as_str(), "");
                                fs::write(Path::new(&global_style_file_path), content).expect("Unable to write file");
                            },
                            Err(error) => {
                                println!("{}", error);
                                println!("Unable to open '{}'. The project may not be initialized.", &global_style_file_path);
                                process::exit(1);
                            }
                        }


                        println!("The component has been removed successfully.");
                    } else {
                        println!("The component does not exist.");
                    }
                },

                _ => {
                    println!("The component subcommand is not implemented yet.");
                }
            }
        }
        
        SubCommand::Run => {
            if let Some(input) = arguments.input {
                let project_path = get_project_path();
                let package_json = PackageJson::from_project_path(project_path);

                if let Some(script) = package_json.scripts.get(&input) {
                    run_command(script);
                } else {
                    println!("The script '{}' does not exist.", input);
                }
            } else {
                print_help(true, "missing input");
                process::exit(1);
            }

        }
        
        SubCommand::Test => {
            let project_path = get_project_path();
            let main_testworker_file_path = format!("{}/src/main.testworker.ts", project_path);

            // deno run src/testworker.service.ts
            Command::new("deno")
                .arg("run")
                .arg(main_testworker_file_path)
                .spawn()
                .expect("failed to execute process")
                .wait().unwrap();
        }
        
        SubCommand::Build => {
            command_build();
        }
        
        SubCommand::Watch => {
            command_build();
            //TODO: implement watch
        }
    }

}


fn get_project_path() -> String {
    let project_path = env::current_dir().unwrap().to_str().unwrap().to_string();
    let components_path = format!("{}/src/components", project_path);
    if !Path::new(&components_path).exists() {
        println!("The current directory is not a frontwork project directory. Please change directory or run 'fw init' to initialize the project first.");
        process::exit(1);
    }

    project_path
}


fn command_build() {
    // TODO: category build; dist/web, dist/electron, dist/android, dist/ios
    let project_path = get_project_path();
    let dist_web_path = format!("{}/dist/web", project_path);
    
    // mkdir dist
    create_dir_all_verbose(dist_web_path);

    // build service and client
    let mut build_service_command = run_command("deno bundle -c deno.jsonc src/main.service.ts dist/web/main.service.js");
    let mut build_client_command = run_command("deno bundle -c deno.client.jsonc src/main.client.ts dist/web/main.client.js");

    // wait after both commands started
    build_service_command.wait().ok();
    build_client_command.wait().ok();
}