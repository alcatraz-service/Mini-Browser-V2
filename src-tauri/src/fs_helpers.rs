use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum FsErr { #[error("io: {0}")] Io(#[from] std::io::Error), #[error("json: {0}")] Json(#[from] serde_json::Error) }

pub fn exe_dir() -> PathBuf {
  std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())).unwrap_or_else(|| std::env::current_dir().unwrap())
}
pub fn ensure_dir(p: &PathBuf) -> Result<(), FsErr> { if !p.exists() { fs::create_dir_all(p)?; } Ok(()) }
pub fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf, def: T) -> Result<T, FsErr> {
  if !path.exists() { return Ok(def); } let s = fs::read_to_string(path)?; Ok(serde_json::from_str(&s)?)
}
pub fn write_json<T: Serialize>(path: &PathBuf, value: &T) -> Result<(), FsErr> {
  if let Some(parent) = path.parent() { ensure_dir(&parent.to_path_buf())?; }
  let s = serde_json::to_string_pretty(value)?; fs::write(path, s)?; Ok(())
}
pub fn remove_dir_if_exists(p: &PathBuf) -> Result<(), FsErr> { if p.exists() { fs::remove_dir_all(p)?; } Ok(()) }
