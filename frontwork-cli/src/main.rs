use convert_case::{Case, Casing};
use environment_platform::Environment;
use include_dir::{include_dir, Dir};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{self, Child};
use std::{env, fs};
use std::{thread, time};
use utils::{create_dir_all_verbose, read_from_line, run_command, transverse_directory};
mod download;
mod environment_platform;
mod package_json;
mod utils;

static PROJECT_TEMPLATE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/template/");
static BUNDLE_TS_FILE_STR: &str = include_str!("../template/bundle.ts");

fn print_help(no_error: bool, error_message: &str) {
    print!("\n");
    if no_error {
        println!("The usage of arguments has been entered wrong because {}. \nPlease follow the following usage:", error_message);
    } else {
        println!("Frontwork CLI Tool v{} by LuceusXylian <luceusxylian@gmail.com> and frontwork-org <https://github.com/frontwork-org> Contributors", env!("CARGO_PKG_VERSION"));
        println!("-- The TypeScript Framework using Deno & Webassembly --");
        println!("\n Usage:");
    }
    println!("  -h or --help                    | this help message");
    println!("  install                         | install required dependencies to develop with Frontwork");
    println!("  init                            | create a new project in the current directory");
    println!("  new                             | create a new folder in the current directory and then execute init");
    println!("  component new                   | create a new component");
    println!("  component remove                | remove a component");
    println!("  run                             | run the script of the entered name in package.json");
    println!("  test                            | run main.testworker.ts");
    println!("  build                           | build the application to the dist folder. Optional use: --production or --staging");
    println!("  watch                           | start development server and build the application on changes");
    println!("");
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
    flag: Flag,
    input: Option<String>,
}

impl Arguments {
    fn new(args: &[String]) -> Result<Arguments, &'static str> {
        if args.len() < 2 {
            return Err("no arguments have been entered");
        }

        if args.contains(&"-h".to_string()) || args.contains(&"--help".to_string()) {
            print_help(true, "");
            return Err("");
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
                _ => return Err("the entered subcommand is not valid"),
            };

            let flag: Flag = if subcommand == SubCommand::Component {
                if args.len() < 3 {
                    return Err("the entered subcommand is not valid");
                }

                match args[2].as_str() {
                    "new" => Flag::New,
                    "add" => Flag::New,
                    "remove" => Flag::Remove,
                    _ => return Err("the entered subcommand is not valid"),
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
                    Some(read_from_line(
                        "Please enter the name of the script to run: ",
                    ))
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
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let arguments = Arguments::new(&args).unwrap_or_else(|err| {
        if err == "" {
            process::exit(0);
        } else {
            print_help(false, err);
            process::exit(2);
        }
    });

    match arguments.subcomand {
        SubCommand::Install => {
            println!("GET & INSTALL: Deno");

            // Check if deno is already installed
            let deno_is_installed = std::process::Command::new("deno")
                .arg("help")
                .output()
                .is_ok();

            if deno_is_installed {
                println!("Deno is already installed");
            } else {
                let target = if cfg!(target_os = "windows") {
                    "x86_64-pc-windows-msvc"
                } else if cfg!(target_os = "macos") {
                    if cfg!(target_arch = "aarch64") {
                        "aarch64-apple-darwin"
                    } else {
                        "x86_64-apple-darwin"
                    }
                } else {
                    "x86_64-unknown-linux-gnu"
                };

                let homedir = env::var("HOME").unwrap();
                let deno_uri = format!(
                    "https://github.com/denoland/deno/releases/latest/download/deno-{}.zip",
                    target
                );
                let deno_install = homedir.clone() + "/.deno";
                let bin_dir = deno_install.clone() + "/bin";
                let bin_file = deno_install.clone() + "/bin/deno";

                // Create Deno installation directory if not exists
                create_dir_all_verbose(&bin_dir);

                match download::download_file(&deno_uri) {
                    Err(_) => {
                        println!("Download of {} failed", deno_uri);
                    }

                    Ok(file_path) => {
                        // Download successful, now unzip it
                        let archive_file: PathBuf = PathBuf::from(file_path);
                        let target_dir: PathBuf = PathBuf::from(bin_dir);
                        if let Err(err) = zip_extensions::zip_extract(&archive_file, &target_dir) {
                            println!("Extration of archive failed.\n\n{:#?}", err);
                        } else {
                            if let Err(err) = utils::make_file_executable(&bin_file) {
                                println!("Unable to make file executable.\n\n{:#?}", err);
                            } else {
                                // Add path env of the executable
                                let bashrc_path = homedir + "/.bashrc";
                                let mut bashrc = fs::read_to_string(&bashrc_path)
                                    .expect(".bashrc should exist and be readable");
                                if !bashrc.contains("DENO_INSTALL") {
                                    bashrc += "\n\n";
                                    bashrc +=
                                        &format!("export DENO_INSTALL=\"{}\"\n", deno_install);
                                    bashrc +=
                                        &"export PATH=\"$DENO_INSTALL/bin:$PATH\"\n".to_string();
                                    fs::write(&bashrc_path, bashrc)
                                        .expect(".bashrc should be writeable");
                                    println!("Deno was installed successfully to {}", bin_file);
                                    println!("Please restart shell to start using it.");
                                }
                            }
                        }
                    }
                }
            }
        }

        SubCommand::Init | SubCommand::New => {
            let project_path = if arguments.subcomand == SubCommand::New {
                // try to create folder with the name of the project
                let projectname = arguments.input.unwrap();
                let projectpath_local = format!(
                    "{}/{}",
                    env::current_dir().unwrap().to_str().unwrap(),
                    projectname
                );
                if Path::new(&projectpath_local).exists() {
                    println!("The projectname has been used. Please use another name.");
                    process::exit(2);
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
            let global_style_content = format!(
                "\n@import './components/{}/{}.scss';",
                componentname, componentname
            );
            let routes_file_path = format!("{}/src/components/routes.ts", project_path);
            let component_import_statement = format!(
                "import {{ {} }} from \"./{}/{}.ts\";",
                componentname_classname, componentname, componentname
            );

            match arguments.flag {
                Flag::New => {
                    // Create the component
                    if Path::new(&componentpath).exists() {
                        println!("The componentname has been used. Please use another name.");
                        process::exit(2);
                    } else {
                        fs::create_dir_all(&componentpath).unwrap();

                        let mut ts_file_content = String::new();
                        ts_file_content.push_str("import { Component, FrontworkContext, DocumentBuilder, FrontworkResponse, FrontworkClient } from \"../../dependencies.ts\";\n\n\n");
                        ts_file_content.push_str(&format!(
                            "export class {} implements Component {{\n",
                            componentname_classname
                        ));
                        ts_file_content.push_str(
                            "    constructor(context: FrontworkContext) {\n        \n    }\n\n",
                        );
                        ts_file_content.push_str("    async build(context: FrontworkContext) {\n");
                        ts_file_content.push_str(
                            "        const document_builder = new DocumentBuilder(context);\n",
                        );
                        ts_file_content.push_str(&format!(
                            "        const title = '{}';\n",
                            componentname_uppercamelcase
                        ));
                        ts_file_content.push_str(&format!(
                            "        const description = '{}';\n",
                            componentname_uppercamelcase
                        ));
                        ts_file_content.push_str("        \n");
                        ts_file_content.push_str("        return await new FrontworkResponse(200, \n");
                        ts_file_content.push_str("            document_builder\n");
                        ts_file_content.push_str("                .add_head_meta_data(title, description, \"index,follow\")\n");
                        ts_file_content.push_str("        );\n");
                        ts_file_content.push_str("    }\n\n");
                        ts_file_content.push_str("    async dom_ready(context: FrontworkContext, client: FrontworkClient) {\n        \n    }\n");
                        ts_file_content.push_str("}\n");

                        fs::write(
                            Path::new(&format!("{}/{}.ts", componentpath, componentname)),
                            ts_file_content,
                        )
                        .expect("Unable to write file");
                        fs::write(
                            Path::new(&format!("{}/{}.scss", componentpath, componentname)),
                            "",
                        )
                        .expect("Unable to write file");

                        // open routes.ts and add the import statement
                        let mut routes_file_content = String::new();
                        routes_file_content.push_str(&component_import_statement);
                        routes_file_content.push_str("\n");
                        routes_file_content += fs::read_to_string(Path::new(&routes_file_path))
                            .expect(&format!("Can not open routes.ts  \"{}\"", routes_file_path))
                            .as_str();
                        fs::write(Path::new(&routes_file_path), routes_file_content).expect(
                            &format!("Unable to write routes.ts  \"{}\"", routes_file_path),
                        );

                        // add the new created component to style.scss
                        let global_style_file = fs::OpenOptions::new()
                            .write(true)
                            .append(true)
                            .open(&global_style_file_path);

                        match global_style_file {
                            Ok(mut global_style_file) => {
                                global_style_file
                                    .write_all(global_style_content.as_bytes())
                                    .expect("Unable to write file");
                                println!("The component has been created successfully.");
                            }
                            Err(error) => {
                                println!("{}", error);
                                println!(
                                    "Unable to open '{}'. The project may not be initialized.",
                                    &global_style_file_path
                                );
                                process::exit(2);
                            }
                        }
                    }
                }
                Flag::Remove => {
                    // Delete the component
                    if Path::new(&componentpath).exists() {
                        fs::remove_dir_all(&componentpath).unwrap();

                        let mut routes_file_content = String::new();
                        fs::read_to_string(Path::new(&routes_file_path))
                            .expect(&format!("Can not open routes.ts  \"{}\"", routes_file_path))
                            .lines()
                            .for_each(|line| {
                                if line != component_import_statement {
                                    routes_file_content.push_str(line);
                                    routes_file_content.push_str("\n");
                                }
                            });
                        fs::write(Path::new(&routes_file_path), routes_file_content).expect(
                            &format!("Unable to write routes.ts  \"{}\"", routes_file_path),
                        );

                        // remove the component from style.scss
                        let global_style_file = fs::OpenOptions::new()
                            .read(true)
                            .open(&global_style_file_path);

                        match global_style_file {
                            Ok(mut global_style_file) => {
                                let mut content = String::new();
                                global_style_file.read_to_string(&mut content).unwrap();
                                content = content.replace(global_style_content.as_str(), "");
                                fs::write(Path::new(&global_style_file_path), content)
                                    .expect("Unable to write file");
                            }
                            Err(error) => {
                                println!("{}", error);
                                println!(
                                    "Unable to open '{}'. The project may not be initialized.",
                                    &global_style_file_path
                                );
                                process::exit(2);
                            }
                        }

                        println!("The component has been removed successfully.");
                    } else {
                        println!("The component does not exist.");
                    }
                }

                _ => {
                    println!("The component subcommand is not implemented yet.");
                }
            }
        }

        SubCommand::Run => {
            if let Some(input) = arguments.input {
                let project_path = get_project_path();
                let package_json = package_json::PackageJson::from_project_path(project_path);

                if let Some(script) = package_json.scripts.get(&input) {
                    run_command(script.to_string());
                } else {
                    println!("The script '{}' does not exist.", input);
                }
            } else {
                print_help(false, "missing input");
                process::exit(2);
            }
        }

        SubCommand::Test => {
            let project_path = get_project_path();
            let main_testworker_file_path = format!("{}/src/main.testworker.ts", project_path);

            // deno run src/testworker.service.ts
            let process = process::Command::new("deno")
                .arg("run")
                .arg(main_testworker_file_path)
                .spawn()
                .expect("failed to execute process")
                .wait()
                .unwrap();

            process::exit(if process.success() { 0 } else { 1 });
        }

        SubCommand::Build => {
            let environment = if args.contains(&"--staging".to_string()) {
                Environment::Staging
            } else if args.contains(&"--development".to_string()) {
                Environment::Development
            } else {
                Environment::Production
            };

            command_build(environment);
        }

        SubCommand::Watch => {
            command_watch();
        }
    }
}

fn get_project_path() -> String {
    let project_path = env::current_dir().unwrap().to_str().unwrap().to_string();
    let package_json_path = format!("{}/package.json", project_path);
    let components_path = format!("{}/src/components", project_path);
    if !Path::new(&package_json_path).exists() || !Path::new(&components_path).exists() {
        println!("The current directory is not a frontwork project directory. Please change directory or run 'frontwork init' to initialize the project first.");
        process::exit(1);
    }

    project_path
}

fn command_build(environment: Environment) {
    println!("Building Frontwork-Project for {}", environment.to_str());

    // TODO: category build; dist/web, dist/electron, dist/android, dist/ios
    // new build path: /dist/{environment}-{platform}/
    let project_path = get_project_path();
    let platform = "web";
    let dist_web_path = format!(
        "{}/dist/{}-{}",
        project_path,
        environment.to_str_lcase(),
        platform
    );

    // environment: move respective files
    // File pattern: environment.{environment}.{platform}.ts
    let envfile_dev_path = &format!("{}/src/environments/environment.ts", project_path);
    let envfile_selected_path = &format!(
        "{}/src/environments/environment.{}.{}.ts",
        project_path,
        environment.to_str_lcase(),
        platform
    );
    let envfile_tempdev_path = &format!(
        "{}/src/environments/environment.development.web.ts",
        project_path
    );
    if environment != Environment::Development {
        if !Path::new(envfile_selected_path).exists() {
            eprintln!(
                "ERROR environment file ({}) does not exists",
                envfile_selected_path
            );
            return;
        } else {
            fs::rename(envfile_dev_path, envfile_tempdev_path)
                .expect("expected to be able rename file");
            fs::rename(envfile_selected_path, envfile_dev_path)
                .expect("expected to be able rename file");
        }
    }

    // mkdir dist
    create_dir_all_verbose(&dist_web_path);

    // build service and client
    let mut build_service_command = build_service(&project_path, &dist_web_path);
    let mut build_client_command = build_client(&project_path, &dist_web_path);

    // rsync assets
    build_assets(&project_path, &dist_web_path);

    // build css
    build_css(&project_path, &dist_web_path);

    // wait for processes
    build_service_command.wait().ok();
    build_client_command.wait().ok();

    // rename files back their original names
    if environment != Environment::Development {
        fs::rename(envfile_dev_path, envfile_selected_path)
            .expect("expected to be able rename file");
        fs::rename(envfile_tempdev_path, envfile_dev_path)
            .expect("expected to be able rename file");
    }
}

fn command_watch() {
    let project_path = get_project_path();
    let src_path_string = format!("{}/src", project_path);
    let src_path = Path::new(&src_path_string);
    let dist_web_path = format!("{}/dist/development-web", project_path);

    // mkdir dist
    create_dir_all_verbose(&dist_web_path);

    // initate watch worker; check src directory if any file changed. If a file changed then build css, client, restart dev server and reload browser page
    let watch_interval_sleep_duration = time::Duration::from_secs(4);
    let mut prev_files = transverse_directory(Path::new(&src_path));
    let mut run_service_process: Option<Child> = None;

    loop {
        // build client
        let mut build_client_command = build_client(&project_path, &dist_web_path);

        // build css
        build_css(&project_path, &dist_web_path);

        // wait for processes
        build_client_command.wait().ok();

        // deno check // since it is easy to miss an 
        std::process::Command::new("deno")
            .arg("check")
            .arg(format!("{project_path}/*.ts"))
            .spawn()
            .expect("Failed to execute deno. Make sure deno is installed on this machine.");

        // start/restart service
        if let Some(mut process) = run_service_process {
            process.kill().ok();
        }
        run_service_process = Some(run_service(&project_path));

        loop {
            let files = transverse_directory(src_path);
            let mut had_changes = prev_files.len() != files.len();

            if !had_changes {
                for file in &files {
                    let mut found_new_file = true;
                    for prev_file in &prev_files {
                        if file.path == prev_file.path {
                            if file.modified != prev_file.modified {
                                had_changes = true;
                                break;
                            }
                            found_new_file = false;
                            break;
                        }
                    }

                    if had_changes {
                        break;
                    }
                    if found_new_file {
                        had_changes = false;
                        break;
                    }
                }
            }

            if had_changes {
                println!("Files changed reload..");
                prev_files = files;
                break;
            } else {
                thread::sleep(watch_interval_sleep_duration);
            }
        }
    }
}

fn build_assets(project_path: &String, dist_web_path: &String) {
    utils::rsync(
        format!("{}/src/assets/", project_path),
        format!("{}/assets/", dist_web_path),
    );
}

fn build_css(project_path: &String, dist_web_path: &String) {
    utils::sass(
        format!("{}/src/style.scss", project_path),
        format!("{}/style.css", dist_web_path),
    );
}

fn build_service(project_path: &String, dist_web_path: &String) -> process::Child {
    let service_binary_path = format!("{}/main.service", dist_web_path);
    if Path::new(&service_binary_path).exists() {
        fs::remove_file(&service_binary_path).expect("Failed to remove existing binary file");
    }

    let mut binding = std::process::Command::new("deno");
    let command = binding
        .arg("compile")
        .arg("-c")
        .arg(format!("{}/deno.jsonc", project_path))
        .arg("-o")
        .arg(service_binary_path)
        .arg("--target")
        .arg("x86_64-unknown-linux-gnu")
        .arg("--allow-read")
        .arg("--allow-net")
        .arg(format!("{}/src/main.service.ts", project_path));

    println!("Program: {}", &command.get_program().to_string_lossy());
    println!("Args: {:?}", &command.get_args().collect::<Vec<_>>());

    command
        .spawn()
        .expect("Failed to execute deno. Make sure deno is installed on this machine.")
}

fn build_client(project_path: &String, dist_web_path: &String) -> process::Child {
    let bundle_ts_path = format!("{}/bundle.ts", project_path);
    let dist_web_file_path = format!("{}/main.client.js", dist_web_path);

    if !Path::new(&bundle_ts_path).exists() {
        fs::write(&bundle_ts_path, BUNDLE_TS_FILE_STR).expect("Unable to write bundle.ts file");
    }

    std::process::Command::new("deno")
        .arg("run")
        .arg("--allow-read")
        .arg("--allow-write")
        .arg("--allow-env")
        .arg("--allow-net")
        .arg("--allow-run")
        .arg(bundle_ts_path)
        .arg(dist_web_file_path)
        .spawn()
        .expect("Failed to execute deno. Make sure deno is installed on this machine.")
}

fn run_service(project_path: &String) -> process::Child {
    std::process::Command::new("deno")
        .arg("run")
        .arg("--allow-net")
        .arg("--allow-read")
        .arg("-c")
        .arg(format!("{}/deno.jsonc", project_path))
        .arg(format!("{}/src/main.service.ts", project_path))
        .spawn()
        .expect("Failed to execute deno. Make sure deno is installed on this machine.")
}
