#![allow(dead_code)]
use std::{fs::File, io::{stdout, Write}, os::unix::fs::PermissionsExt, path::{Path, PathBuf}, process::Child, time::SystemTime};
use std::fs;
use rsass::{compile_scss_path, output};
use zip::{result::ZipResult, ZipArchive};


pub fn find_optional_arg(args: &[String], find: &str) -> Option<String> {
    let args_len = args.len();
    if args_len > 3 {
        for i in 2..args_len {
            if args[i] == find {
                return if i+1 < args_len { Some(args[i+1].clone()) } else { None };
            }
        }
    }

    None
}


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
    match compile_scss_path(src.as_ref(), format) {
        Ok(css) => {
            match fs::write(Path::new(&dest), css) {
                Ok(f) => f,
                Err(error) => panic!("can not write css file to {:?}. Error: {:?}", dest, error)
            }
        },
        Err(error) => println!("Unable to compile sass: {}", error),
    }
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

pub fn make_file_executable(file_path: &str) -> std::result::Result<(), std::io::Error> {
    fs::set_permissions(file_path, fs::Permissions::from_mode(0o775))
}

/// Extracts a ZIP file to the given directory.
pub fn zip_extract(archive_file: &PathBuf, target_dir: &PathBuf) -> ZipResult<()> {
    let file = File::open(archive_file).unwrap();
    let mut archive = ZipArchive::new(file).unwrap();
    archive.extract(target_dir)
}

// pub fn move_file(from_filepath: &String, to_filepath: &String) {
//     if std::fs::rename(&from_filepath, to_filepath).is_err()  {
//         // failed to rename, the file could be on another disk, so we copy and then delete it
//         if let Err(e) = std::fs::copy(&from_filepath, &to_filepath) {
//             eprintln!("failed to move file from: {}  to  {}\n{}", &from_filepath, &to_filepath, e);
//             std::process::exit(1);
//         } else {
//             std::fs::remove_file(&from_filepath).ok();
//         }
//     }
// }

