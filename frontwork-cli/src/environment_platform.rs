
#[derive(PartialEq)]
pub enum Environment {
    Development,
    Staging,
    Production,
}

impl Environment {
    pub fn to_str(&self) -> &str {
        match self {
            Environment::Development => "Development",
            Environment::Staging => "Staging",
            Environment::Production => "Production",
        }
    }

    pub fn to_str_lcase(&self) -> &str {
        match self {
            Environment::Development => "development",
            Environment::Staging => "staging",
            Environment::Production => "production",
        }
    }
}

