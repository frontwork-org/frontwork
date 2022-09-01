use std::{collections::HashMap, path::Path, fs};
use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize)]
pub struct PackageJson {
    pub scripts: HashMap<String, String>,
}

impl PackageJson {
    pub fn from_project_path(project_path: String) -> PackageJson {
        let package_json_path_string = &format!("{}/package.json", project_path);
        let package_json_path = Path::new(&package_json_path_string);
        let package_json_content = fs::read_to_string(package_json_path).expect(&format!("Can not open package.json  \"{}\"", package_json_path.display()));
        let package_json: PackageJson = serde_json::from_str(&package_json_content).expect(&format!("Unable to parse package.json  \"{}\"", package_json_path.display()));
        package_json
    }
}
