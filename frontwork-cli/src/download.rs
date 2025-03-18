use anyhow::{Context, Result, bail};
use reqwest::header::{HeaderValue, CONTENT_LENGTH, RANGE};
use reqwest::StatusCode;
use std::fs::File;
use std::str::FromStr;

const TMP_DIR: &str = if cfg!(target_os = "windows") { "C:\\" } else { "/tmp" };

struct DownloadPartialRangeIter {
    start: u64,
    end: u64,
    buffer_size: u32,
}

impl DownloadPartialRangeIter {
    pub fn new(start: u64, end: u64, buffer_size: u32) -> Result<Self> {
        if buffer_size == 0 {
            bail!("invalid buffer_size, give a value greater than zero.");
        }
        Ok(DownloadPartialRangeIter {
            start,
            end,
            buffer_size,
        })
    }
}

impl Iterator for DownloadPartialRangeIter {
    type Item = HeaderValue;
    fn next(&mut self) -> Option<Self::Item> {
        if self.start > self.end {
            None
        } else {
            let mut progress_percentage = ((self.start as f64 / self.end as f64)*100.0).ceil() as u64;
            if progress_percentage == 100 && self.start != self.end { progress_percentage = 99; }

            println!("Download progress: {}%    {}/{}", 
                fillspaces(progress_percentage, 100), 
                fillspaces(self.start, self.end), 
                self.end
            );
            
            self.start += std::cmp::min(self.buffer_size as u64, self.end - self.start + 1);
            Some(
                HeaderValue::from_str(&format!("bytes={}-{}", self.start, self.start - 1))
                    .expect("string provided by format!")
            )
        }
    }
}

fn fillspaces(start: u64, end: u64) -> String {
    let start_string = start.to_string();
    [
        " ".repeat(end.to_string().len() - start_string.len()).to_string(),
        start_string,
    ].concat()
}

pub fn download_file(url: &str) -> Result<String> {
    const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
    const CHUNK_SIZE: u32 = 10240 * 64;
    let client = reqwest::blocking::Client::new();

    // HEAD request: parse Content-Length header
    let response = client.head(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .context("failed to send HEAD request")?;
    
    let status = response.status();
    if status != StatusCode::OK {
        bail!("Unexpected server response: {} in HEAD request. \n\n{:#?}", status, response);
    }

    let length = response
        .headers()
        .get(CONTENT_LENGTH)
        .context("response doesn't include the content length")?;
    let length = u64::from_str(length.to_str()?)
        .context("invalid Content-Length header")?;

    // Prepare a file for the download
    let filename = url.split("/").last().unwrap();
    let tmp_dir = TMP_DIR.to_string() + "/http-download-fw";
    std::fs::create_dir_all(&tmp_dir)
        .context("failed to create temporary directory")?;
    let tmp_filepath = [tmp_dir, "/".to_string(), filename.to_string()].concat();
    let mut output_file = File::create(&tmp_filepath)
        .context("failed to create output file")?;

    // GET requests: 
    println!("starting download...");
    for range in DownloadPartialRangeIter::new(0, length - 1, CHUNK_SIZE)? {
        let mut response = client.get(url)
            .header("User-Agent", USER_AGENT)
            .header(RANGE, range)
            .send()
            .context("failed to send GET request")?;

        let status = response.status();
        if !(status == StatusCode::OK || status == StatusCode::PARTIAL_CONTENT) {
            bail!("Unexpected server response: {} in GET request. \n\n{:#?}", status, response);
        }
        std::io::copy(&mut response, &mut output_file)
            .context("failed to copy response to file")?;
    }
    
    println!("Finished with success!");
    Ok(tmp_filepath)
}

#[cfg(test)]
#[test]
fn test_download_file() {
    let url = "https://httpbin.org/headers";
    println!("Download-Filename: {:#?}", download_file(url).unwrap());
}