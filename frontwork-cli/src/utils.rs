use std::{io::{stdout, Write}, process::Child, path::Path, fs};



pub fn read_from_line(message: &str) -> String {
    print!("\n{}", message);
    stdout().flush().unwrap();
    let mut input_buffer = String::new();
    std::io::stdin().read_line(&mut input_buffer).expect("Failed to read line");
    input_buffer.trim().to_string()
}

pub fn run_command(command: &str) -> Child {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(command)
        .spawn()
        .expect("failed to execute process")
}

pub fn create_dir_all_verbose(path: String) {
    let dist_path = Path::new(&path);
    if !dist_path.exists() {
        fs::create_dir_all(&dist_path).unwrap();
    }
}