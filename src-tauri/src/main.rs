#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::Manager;
mod fs_helpers; use fs_helpers::*;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Settings {
  lang: String,
  showAddress: bool,
  showTabs: bool,
  onTop: bool,
  rememberSession: bool,
  borderPx: u8,
  ribbon: Ribbon,
  hud: bool,
  snap: bool,
  bookmarks: Vec<String>
}
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Ribbon { enabled: bool, width: i32, height: i32 }

#[derive(Default)]
struct AppState { opacity_ix: std::sync::Mutex<usize> }

fn data_dir() -> std::path::PathBuf { exe_dir().join("data") }
fn settings_path() -> std::path::PathBuf { data_dir().join("settings.json") }
fn history_path() -> std::path::PathBuf { data_dir().join("history.json") }
fn last_url_path() -> std::path::PathBuf { data_dir().join("last_url.txt") }
fn profile_dir() -> std::path::PathBuf { exe_dir().join("profile") }

#[tauri::command] fn read_settings() -> Result<Settings, String> {
  let def = Settings { lang:"ru".into(), showAddress:true, showTabs:true, onTop:false, rememberSession:true, borderPx:3, ribbon: Ribbon { enabled:false, width:480, height:120 }, hud:false, snap:false, bookmarks: vec!["https://www.google.com".into()] };
  read_json(&settings_path(), def).map_err(|e| e.to_string())
}
#[tauri::command] fn write_settings(value: Settings) -> Result<(), String> { write_json(&settings_path(), &value).map_err(|e| e.to_string()) }
#[tauri::command] fn append_history(url: String) -> Result<(), String> {
  let mut list: Vec<String> = read_json(&history_path(), Vec::<String>::new()).map_err(|e| e.to_string())?;
  list.push(url); if list.len() > 200 { let start = list.len() - 200; list = list.split_off(start); }
  write_json(&history_path(), &list).map_err(|e| e.to_string())
}
#[tauri::command] fn clear_history() -> Result<(), String> { write_json(&history_path(), &Vec::<String>::new()).map_err(|e| e.to_string()) }
#[tauri::command] fn last_url() -> Result<String, String> { std::fs::read_to_string(last_url_path()).map_err(|_| "".into()) }
#[tauri::command] fn cycle_opacity(state: tauri::State<AppState>) -> f64 {
  let steps = [1.0, 0.9, 0.8, 0.7, 0.6]; let mut ix = state.opacity_ix.lock().unwrap(); *ix = (*ix + 1) % steps.len(); steps[*ix]
}
#[tauri::command] fn set_ignore_cursor(window: tauri::Window, ignore: bool) -> Result<(), String> { window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string()) }
#[tauri::command] fn clear_cache(hard: bool) -> Result<(), String> {
  let p = profile_dir(); let cache = p.join("Cache"); remove_dir_if_exists(&cache).map_err(|e| e.to_string())?; if hard { remove_dir_if_exists(&p).map_err(|e| e.to_string())?; } Ok(())
}

fn ensure_portable_profile() {
  #[cfg(target_os = "windows")] {
    let p = profile_dir(); let _ = std::fs::create_dir_all(&p); std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &p);
  }
}

fn main() {
  ensure_portable_profile();
  tauri::Builder::default()
    .manage(AppState::default())
    .setup(|app| {
      let handle = app.handle();
      handle.listen("url-changed", move |event| { if let Some(url) = event.payload() { let _ = std::fs::write(last_url_path(), url); } });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![read_settings, write_settings, append_history, clear_history, last_url, cycle_opacity, set_ignore_cursor, clear_cache])
    .run(tauri::generate_context!())
    .expect("error while running tauri app");
}
