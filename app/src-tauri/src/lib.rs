mod model;

use std::sync::Mutex;
use std::collections::VecDeque;
use tauri::Manager;

#[derive(serde::Deserialize)]
struct SaveArgs {
  doc: model::BoardDocument,
}

#[derive(Debug, Default)]
struct AppState {
  recent_files: VecDeque<String>,
  last_save_path: Option<String>,
}

const MAX_RECENT_FILES: usize = 10;

// Helper functions for .fim zip container
fn save_as_fim(doc: &model::BoardDocument, path: &std::path::Path) -> Result<(), String> {
  use std::io::Write;
  use zip::{ZipWriter, write::FileOptions};

  let file = std::fs::File::create(path)
    .map_err(|e| format!("Failed to create file '{}': {}", path.display(), e))?;

  let mut zip = ZipWriter::new(file);
  let options = FileOptions::default()
    .compression_method(zip::CompressionMethod::Deflated)
    .unix_permissions(0o755);

  // Add board.json
  let json = serde_json::to_string_pretty(doc)
    .map_err(|e| format!("Failed to serialize document: {}", e))?;

  zip.start_file("board.json", options)
    .map_err(|e| format!("Failed to create board.json in zip: {}", e))?;
  zip.write_all(json.as_bytes())
    .map_err(|e| format!("Failed to write board.json: {}", e))?;

  // Create media directory (empty for now, but will be used for future media files)
  zip.add_directory("media/", options)
    .map_err(|e| format!("Failed to create media directory: {}", e))?;

  zip.finish()
    .map_err(|e| format!("Failed to finalize zip file: {}", e))?;

  Ok(())
}

fn load_from_fim(path: &std::path::Path) -> Result<model::BoardDocument, String> {
  use std::io::Read;
  use zip::ZipArchive;

  let file = std::fs::File::open(path)
    .map_err(|e| format!("Failed to open file '{}': {}", path.display(), e))?;

  let mut archive = ZipArchive::new(file)
    .map_err(|e| format!("Failed to read zip file '{}': {}", path.display(), e))?;

  // Read board.json from the zip
  let board_json_file = archive.by_name("board.json")
    .map_err(|e| format!("Failed to find board.json in zip: {}", e))?;

  let mut json_content = String::new();
  board_json_file.take(100_000_000).read_to_string(&mut json_content) // Limit to 100MB
    .map_err(|e| format!("Failed to read board.json content: {}", e))?;

  let doc: model::BoardDocument = serde_json::from_str(&json_content)
    .map_err(|e| format!("Invalid JSON format in board.json: {}", e))?;

  Ok(doc)
}

#[tauri::command]
async fn open_document(app: tauri::AppHandle) -> Result<model::BoardDocument, String> {
  use tauri_plugin_dialog::DialogExt;
  use std::fs;

  let file_path = app.dialog()
    .file()
    .add_filter("FIM Files", &["fim"])
    .add_filter("JSON", &["json"])
    .add_filter("All Supported", &["fim", "json"])
    .set_title("Open Board Document")
    .blocking_pick_file();

  let path = match file_path {
    Some(p) => p.as_path().unwrap().to_path_buf(),
    None => return Err("Operation cancelled by user".into()),
  };

  // Check file extension to determine format
  let extension = path.extension()
    .and_then(|ext| ext.to_str())
    .unwrap_or("");

  let doc = match extension {
    "fim" => load_from_fim(&path)?,
    "json" => {
      let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;

      let parsed_doc: model::BoardDocument = serde_json::from_str(&data)
        .map_err(|e| format!("Invalid JSON format: {}", e))?;
      parsed_doc
    },
    _ => return Err(format!("Unsupported file format: '{}'. Supported formats: .fim, .json", extension)),
  };
  
  // Schema validation
  if doc.schema_version == 0 { 
    return Err("Invalid or missing schema version".into()); 
  }
  
  if doc.schema_version > 1 {
    return Err(format!("Unsupported schema version {}. Please update the application.", doc.schema_version));
  }
  
  // Add to recent files
  let path_str = path.to_string_lossy().to_string();
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      // Remove if already exists to avoid duplicates
      app_state.recent_files.retain(|p| p != &path_str);
      // Add to front
      app_state.recent_files.push_front(path_str);
      // Limit size
      if app_state.recent_files.len() > MAX_RECENT_FILES {
        app_state.recent_files.pop_back();
      }
    }
  }
  
  Ok(doc)
}

#[tauri::command]
async fn open_specific_document(app: tauri::AppHandle, file_path: String) -> Result<model::BoardDocument, String> {
  use std::path::Path;

  let path = Path::new(&file_path);

  // Check file extension to determine format
  let extension = path.extension()
    .and_then(|ext| ext.to_str())
    .unwrap_or("");

  let doc = match extension {
    "fim" => load_from_fim(&path)?,
    "json" => {
      use std::fs;
      let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;

      let parsed_doc: model::BoardDocument = serde_json::from_str(&data)
        .map_err(|e| format!("Invalid JSON format: {}", e))?;
      parsed_doc
    },
    _ => return Err(format!("Unsupported file format: '{}'. Supported formats: .fim, .json", extension)),
  };

  // Schema validation
  if doc.schema_version == 0 {
    return Err("Invalid or missing schema version".into());
  }

  if doc.schema_version > 1 {
    return Err(format!("Unsupported schema version {}. Please update the application.", doc.schema_version));
  }

  // Add to recent files
  let path_str = path.to_string_lossy().to_string();
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      // Remove if already exists to avoid duplicates
      app_state.recent_files.retain(|p| p != &path_str);
      // Add to front
      app_state.recent_files.push_front(path_str);
      // Limit size
      if app_state.recent_files.len() > MAX_RECENT_FILES {
        app_state.recent_files.pop_back();
      }
    }
  }

  Ok(doc)
}

#[tauri::command]
async fn save_document(app: tauri::AppHandle, args: SaveArgs) -> Result<String, String> {
  use tauri_plugin_dialog::DialogExt;
  use std::fs;

  // Validate document before saving
  if args.doc.schema_version == 0 {
    return Err("Cannot save document with invalid schema version".into());
  }

  let file_path = app.dialog()
    .file()
    .add_filter("FIM Files", &["fim"])
    .add_filter("JSON", &["json"])
    .add_filter("All Supported", &["fim", "json"])
    .set_file_name("untitled.fim")
    .set_title("Save Board Document")
    .blocking_save_file();

  let path = match file_path {
    Some(p) => p.as_path().unwrap().to_path_buf(),
    None => return Err("Save operation cancelled by user".into()),
  };

  // Check file extension to determine format
  let extension = path.extension()
    .and_then(|ext| ext.to_str())
    .unwrap_or("");

  match extension {
    "fim" => save_as_fim(&args.doc, &path)?,
    "json" => {
      let json = serde_json::to_string_pretty(&args.doc)
        .map_err(|e| format!("Failed to serialize document: {}", e))?;

      use std::fs;
      fs::write(&path, &json)
        .map_err(|e| format!("Failed to write file '{}': {}", path.display(), e))?;
    },
    _ => return Err(format!("Unsupported file format: '{}'. Supported formats: .fim, .json", extension)),
  }
  
  // Update state with last save path
  let path_str = path.to_string_lossy().to_string();
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.last_save_path = Some(path_str.clone());
      // Also add to recent files
      app_state.recent_files.retain(|p| p != &path_str);
      app_state.recent_files.push_front(path_str.clone());
      if app_state.recent_files.len() > MAX_RECENT_FILES {
        app_state.recent_files.pop_back();
      }
    }
  }
  
  Ok(path_str)
}

#[tauri::command]
async fn get_recent_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(app_state) = state.lock() {
      return Ok(app_state.recent_files.iter().cloned().collect());
    }
  }
  Ok(Vec::new())
}

#[tauri::command] 
async fn clear_recent_files(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.recent_files.clear();
    }
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Initialize devtools early for better debugging
  #[cfg(debug_assertions)]
  let devtools = tauri_plugin_devtools::init();

  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init());

  #[cfg(debug_assertions)]
  {
    builder = builder.plugin(devtools);
  }

  builder
    .setup(|app| {
      // Initialize state
      app.manage(Mutex::new(AppState::default()));
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_document,
      open_specific_document,
      save_document,
      get_recent_files,
      clear_recent_files
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
