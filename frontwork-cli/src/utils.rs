use std::{io::{stdout, Write}, process::Child, path::{Path}, time::SystemTime};
use std::fs;
use rsass::{compile_scss_path, output};



pub fn read_from_line(message: &str) -> String {
    print!("\n{}", message);
    stdout().flush().unwrap();
    let mut input_buffer = String::new();
    std::io::stdin().read_line(&mut input_buffer).expect("Failed to read line");
    input_buffer.trim().to_string()
}

pub fn run_command(command: String) -> Child {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(command)
        .spawn()
        .expect("failed to execute process")
}

pub fn create_dir_all_verbose(path: &String) {
    let dist_path = Path::new(&path);
    if !dist_path.exists() {
        fs::create_dir_all(&dist_path).unwrap();
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

pub fn rsync(src: String, dest: String) {
    let console_info = rusync::ConsoleProgressInfo::new();
    // or any struct that implements the ProgressInfo trait
    let options = rusync::SyncOptions::default();
    let source = std::path::Path::new(&src);
    let destination = std::path::Path::new(&dest);
    let syncer = rusync::Syncer::new(&source, &destination, options, Box::new(console_info));
    let stats = syncer.sync();
    match stats {
        Err(err) => {
            eprintln!("Error when syncing: {}", err);
        }
        Ok(stats) => {
            println!("Transfered {} files", stats.copied);
        }
    }
}

pub fn sass(src: String, dest: String) {
    let format = output::Format {
        style: output::Style::Compressed,
        .. Default::default()
    };
    let css = compile_scss_path(src.as_ref(), format).unwrap();
    fs::write(Path::new(&dest), css).expect("can not write css file");
}

pub struct TransversedFile {
    pub path: String,
    pub modified: SystemTime,
}

pub fn transverse_directory(dir_path: &Path) -> Vec<TransversedFile> {
    let mut files: Vec<TransversedFile> = Vec::new();

    fs::read_dir(dir_path).unwrap().for_each(|entry| {
        let file = entry.unwrap();
        let path = file.path();

        let metadata = file.metadata().unwrap();

        if metadata.is_file() {
            files.push(TransversedFile {
                path: path.as_os_str().to_str().unwrap().to_string(),
                modified: metadata.modified().unwrap()
            });
        } else {
            for file in transverse_directory(&path) {
                files.push(file);
            }
        }
    });

    files
}