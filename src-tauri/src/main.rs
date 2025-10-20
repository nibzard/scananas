#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod model;

#[tauri::command]
fn open_document(window: tauri::Window) -> Result<model::BoardDocument, String> {
  use tauri::api::dialog::FileDialogBuilder;
  use std::fs;

  let (tx, rx) = std::sync::mpsc::channel();
  FileDialogBuilder::new()
    .add_filter("JSON", &["json"]) // TODO: add .fim container later
    .set_title("Open Board JSON")
    .pick_file(move |file_path| {
      let _ = tx.send(file_path);
    });

  let selected = rx.recv().map_err(|e| e.to_string())?;
  let path = match selected { Some(p) => p, None => return Err("cancelled".into()) };
  let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
  let doc: model::BoardDocument = serde_json::from_str(&data).map_err(|e| e.to_string())?;
  // simple schema gate (optional)
  if doc.schemaVersion == 0 { return Err("invalid schemaVersion".into()); }
  Ok(doc)
}

#[derive(serde::Deserialize)]
struct SaveArgs {
  doc: model::BoardDocument,
}

#[tauri::command]
fn save_document(window: tauri::Window, args: SaveArgs) -> Result<String, String> {
  use tauri::api::dialog::FileDialogBuilder;
  use std::fs;

  let (tx, rx) = std::sync::mpsc::channel();
  FileDialogBuilder::new()
    .add_filter("JSON", &["json"]) // TODO: support .fim
    .set_file_name("board.json")
    .set_title("Save Board JSON")
    .save_file(move |file_path| {
      let _ = tx.send(file_path);
    });

  let selected = rx.recv().map_err(|e| e.to_string())?;
  let path = match selected { Some(p) => p, None => return Err("cancelled".into()) };
  let json = serde_json::to_string_pretty(&args.doc).map_err(|e| e.to_string())?;
  fs::write(&path, json).map_err(|e| e.to_string())?;
  Ok(path.to_string_lossy().to_string())
}

fn main() {
  tauri::Builder::default()
    .setup(|_app| Ok(()))
    .invoke_handler(tauri::generate_handler![open_document, save_document])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
