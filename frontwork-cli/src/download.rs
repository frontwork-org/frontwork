use anyhow::{Context, Result};
use std::fs::File;
use std::io::Write;
use reqwest;
use indicatif::{ProgressBar, ProgressStyle};
use futures_util::StreamExt;

const TMP_DIR: &str = if cfg!(target_os = "windows") { "C:\\" } else { "/tmp" };

pub async fn download_large_file(url: &str) -> Result<String> {
    // Create HTTP client
    let client = reqwest::Client::new();
    
    // Send GET request
    let response = client
        .get(url)
        .send()
        .await
        .context("Failed to send HTTP request")?;
    
    // Get content length for progress bar
    let total_size = response
        .content_length()
        .context("Failed to get content length")?;
    
    // Ensure file is at least 1MB
    if total_size < 1024 * 1024 {
        anyhow::bail!("File is smaller than 1MB");
    }

    // Create progress bar
    let pb = ProgressBar::new(total_size);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")
        .unwrap()
        .progress_chars("#>-"));

    // Prepare a file for the download
    let filename = url.split("/").last().unwrap();
    let tmp_dir = TMP_DIR.to_string() + "/http-download-fw";
    std::fs::create_dir_all(&tmp_dir)
        .context("failed to create temporary directory")?;
    let tmp_filepath = format!("{}/{}", tmp_dir, filename);
    
    // Create the file with write permissions
    let mut file = File::create(&tmp_filepath)
        .context("failed to create file")?;
    
    // Download the file
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Failed to download chunk")?;
        file.write_all(&chunk)
            .context("Failed to write to file")?;
        
        downloaded += chunk.len() as u64;
        pb.set_position(downloaded);
    }
    
    pb.finish_with_message("Download completed");
    Ok(tmp_filepath)
}


#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_download() {
        let test_url = "https://objects.githubusercontent.com/github-production-release-asset-2e65be/133442384/acc1ee8f-c1a2-4e84-b215-2fe1ec73b8f6?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=releaseassetproduction%2F20250420%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250420T195525Z&X-Amz-Expires=300&X-Amz-Signature=e116a1fd95ff18f7808002ae183898d9887d47826687f9a97154ce492d077b0e&X-Amz-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%3Ddeno-x86_64-unknown-linux-gnu.zip&response-content-type=application%2Foctet-stream";
        let result = download_large_file(test_url).await;
        
        match result {
            Ok(path) => {
                std::fs::remove_file(&path).unwrap_or(());
            },
            Err(e) => {
                panic!("Download failed with error: {:#?}", e);
            }
        }
    }
}