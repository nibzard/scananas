mod model;

use std::sync::Mutex;
use std::collections::VecDeque;
use tauri::Manager;
use std::path::{Path, PathBuf};

#[derive(serde::Deserialize)]
struct SaveArgs {
  doc: model::BoardDocument,
}

#[derive(serde::Deserialize)]
struct AutosaveArgs {
  doc: model::BoardDocument,
  file_path: String,
}

#[derive(serde::Deserialize)]
struct ExportTextArgs {
  doc: model::BoardDocument,
  format: String, // "txt", "rtf", "opml"
  ordering: Option<String>, // "spatial", "connections", "hierarchical"
}


#[derive(Debug, Default)]
struct AppState {
  recent_files: VecDeque<String>,
  last_save_path: Option<String>,
  current_document_path: Option<String>,
  last_autosave_time: Option<std::time::SystemTime>,
  is_dirty: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct AutosaveInfo {
  original_path: String,
  recovery_path: String,
  timestamp: chrono::DateTime<chrono::Utc>,
}

const MAX_RECENT_FILES: usize = 10;

// Helper functions for recovery file management
fn get_recovery_path(original_path: &std::path::Path) -> PathBuf {
  let mut recovery_path = original_path.to_owned();
  recovery_path.set_extension("fim.recovery");
  recovery_path
}

fn save_as_recovery(doc: &model::BoardDocument, original_path: &std::path::Path) -> Result<AutosaveInfo, String> {
  let recovery_path = get_recovery_path(original_path);

  // Create autosave info
  let autosave_info = AutosaveInfo {
    original_path: original_path.to_string_lossy().to_string(),
    recovery_path: recovery_path.to_string_lossy().to_string(),
    timestamp: chrono::Utc::now(),
  };

  // Create metadata file with autosave info
  let metadata_path = recovery_path.with_extension("fim.recovery.meta");
  let metadata_json = serde_json::to_string_pretty(&autosave_info)
    .map_err(|e| format!("Failed to serialize recovery metadata: {}", e))?;

  std::fs::write(&metadata_path, metadata_json)
    .map_err(|e| format!("Failed to write recovery metadata: {}", e))?;

  // Save the actual document to recovery file
  save_as_fim(doc, &recovery_path)?;

  Ok(autosave_info)
}

fn check_for_recovery_files() -> Result<Vec<AutosaveInfo>, String> {
  use std::fs;
  let mut recovery_files = Vec::new();

  // Common directories where recovery files might be found
  let search_paths = vec![
    std::env::temp_dir(),
    std::env::current_dir().unwrap_or_else(|_| std::env::temp_dir()),
    // Add user's home directory if available
    dirs::home_dir().unwrap_or_else(|| std::env::temp_dir()),
    // Add user's documents directory if available
    dirs::document_dir().unwrap_or_else(|| std::env::temp_dir()),
  ];

  for search_path in search_paths {
    if let Ok(entries) = fs::read_dir(&search_path) {
      for entry in entries.flatten() {
        let path = entry.path();
        if let Some(file_name) = path.file_name() {
          if let Some(name_str) = file_name.to_str() {
            if name_str.ends_with(".fim.recovery") {
              // Try to extract metadata from the recovery file
              if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                  // Determine original filename by removing .recovery extension
                  let original_filename = name_str.replace(".recovery", "");
                  
                  recovery_files.push(AutosaveInfo {
                    recovery_path: path.to_string_lossy().to_string(),
                    original_path: format!("{}/{}", search_path.display(), original_filename),
                    timestamp: chrono::DateTime::from_timestamp(
                      modified.duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or(std::time::Duration::from_secs(0))
                        .as_secs() as i64, 
                      0
                    ).unwrap_or(chrono::Utc::now()),
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // Sort by timestamp (newest first)
  recovery_files.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
  
  Ok(recovery_files)
}

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
    Some(p) => match p.as_path() {
      Some(path) => path.to_path_buf(),
      None => return Err("Invalid file path selected".into()),
    },
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
    Some(p) => match p.as_path() {
      Some(path) => path.to_path_buf(),
      None => return Err("Invalid save path selected".into()),
    },
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
  
  // Update state with current document path
  let path_str = path.to_string_lossy().to_string();
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.last_save_path = Some(path_str.clone());
      app_state.current_document_path = Some(path_str.clone());
      app_state.is_dirty = false;
      app_state.last_autosave_time = Some(std::time::SystemTime::now());

      // Also add to recent files
      app_state.recent_files.retain(|p| p != &path_str);
      app_state.recent_files.push_front(path_str.clone());
      if app_state.recent_files.len() > MAX_RECENT_FILES {
        app_state.recent_files.pop_back();
      }

      // Clean up recovery file if it exists
      let recovery_path = get_recovery_path(&path);
      if recovery_path.exists() {
        let _ = std::fs::remove_file(&recovery_path);
      }
      let metadata_path = recovery_path.with_extension("fim.recovery.meta");
      if metadata_path.exists() {
        let _ = std::fs::remove_file(&metadata_path);
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

#[tauri::command]
async fn autosave_document(app: tauri::AppHandle, args: AutosaveArgs) -> Result<AutosaveInfo, String> {
  use std::path::Path;

  // Validate document before autosaving
  if args.doc.schema_version == 0 {
    return Err("Cannot autosave document with invalid schema version".into());
  }

  let path = Path::new(&args.file_path);

  // Perform autosave
  let autosave_info = save_as_recovery(&args.doc, path)?;

  // Update state
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.last_autosave_time = Some(std::time::SystemTime::now());
      app_state.is_dirty = false;
    }
  }

  Ok(autosave_info)
}

#[tauri::command]
async fn set_document_dirty(app: tauri::AppHandle, is_dirty: bool) -> Result<(), String> {
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.is_dirty = is_dirty;
    }
  }
  Ok(())
}

#[tauri::command]
async fn set_current_document_path(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      app_state.current_document_path = Some(file_path);
      app_state.last_autosave_time = None; // Reset autosave time for new document
    }
  }
  Ok(())
}

#[tauri::command]
async fn get_autosave_status(app: tauri::AppHandle) -> Result<Option<AutosaveInfo>, String> {
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(app_state) = state.lock() {
      if let Some(current_path) = &app_state.current_document_path {
        let recovery_path = get_recovery_path(Path::new(current_path));
        let metadata_path = recovery_path.with_extension("fim.recovery.meta");

        if metadata_path.exists() {
          let metadata_content = std::fs::read_to_string(&metadata_path)
            .map_err(|e| format!("Failed to read recovery metadata: {}", e))?;

          let autosave_info: AutosaveInfo = serde_json::from_str(&metadata_content)
            .map_err(|e| format!("Failed to parse recovery metadata: {}", e))?;

          return Ok(Some(autosave_info));
        }
      }
    }
  }
  Ok(None)
}

#[tauri::command]
async fn check_recovery_files() -> Result<Vec<AutosaveInfo>, String> {
  check_for_recovery_files()
}

#[tauri::command]
async fn recover_from_autosave(app: tauri::AppHandle, recovery_path: String) -> Result<model::BoardDocument, String> {
  let path = Path::new(&recovery_path);

  if !path.exists() {
    return Err("Recovery file not found".into());
  }

  // Load from the recovery file (which is in .fim format)
  let doc = load_from_fim(path)?;

  // Update state to indicate we're working with a recovered document
  if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut app_state) = state.lock() {
      // Try to determine the original path from recovery file
      if let Some(original_path) = path.parent().and_then(|p| p.file_name()) {
        if let Some(original_str) = original_path.to_str() {
          // Remove .recovery extension to get original filename
          let original_filename = original_str.replace(".fim.recovery", ".fim");
          if let Some(parent) = path.parent() {
            app_state.current_document_path = Some(format!("{}/{}", parent.display(), original_filename));
          }
        }
      }
      app_state.is_dirty = true; // Mark as dirty since it's recovered
      app_state.last_autosave_time = None;
    }
  }

  Ok(doc)
}

// PNG export command - handles file dialog and path selection
#[tauri::command]
async fn export_document_as_png(app: tauri::AppHandle, scale: f64) -> Result<String, String> {
  use tauri_plugin_dialog::DialogExt;

  // Validate scale is one of the supported values
  if scale != 1.0 && scale != 2.0 && scale != 3.0 {
    return Err("Scale must be 1.0, 2.0, or 3.0".to_string());
  }

  let file_path = app.dialog()
    .file()
    .add_filter("PNG Files", &["png"])
    .set_file_name(&format!("idea_map_{}x.png", scale))
    .set_title(&format!("Export as PNG ({}x DPI)", scale))
    .blocking_save_file();

  let path = match file_path {
    Some(p) => match p.as_path() {
      Some(path) => path.to_path_buf(),
      None => return Err("Invalid save path selected".into()),
    },
    None => return Err("Export operation cancelled by user".into()),
  };

  Ok(path.to_string_lossy().to_string())
}

// PDF export command - handles file dialog and path selection
#[tauri::command]
async fn export_document_as_pdf(app: tauri::AppHandle, page_size: String, orientation: String) -> Result<String, String> {
  use tauri_plugin_dialog::DialogExt;

  // Validate page size
  let valid_sizes = vec!["a3", "a4", "a5", "letter", "legal"];
  if !valid_sizes.contains(&page_size.as_str()) {
    return Err("Invalid page size. Must be one of: a3, a4, a5, letter, legal".to_string());
  }

  // Validate orientation
  let valid_orientations = vec!["auto", "portrait", "landscape"];
  if !valid_orientations.contains(&orientation.as_str()) {
    return Err("Invalid orientation. Must be one of: auto, portrait, landscape".to_string());
  }

  let file_path = app.dialog()
    .file()
    .add_filter("PDF Files", &["pdf"])
    .set_file_name(&format!("idea_map_{}_{}.pdf", page_size, orientation))
    .set_title(&format!("Export as PDF ({} {})", page_size.to_uppercase(), orientation))
    .blocking_save_file();

  let path = match file_path {
    Some(p) => match p.as_path() {
      Some(path) => path.to_path_buf(),
      None => return Err("Invalid save path selected".into()),
    },
    None => return Err("Export operation cancelled by user".into()),
  };

  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_pdf_to_file(file_path: String, pdf_data: Vec<u8>) -> Result<(), String> {
  use std::fs;

  fs::write(&file_path, pdf_data)
    .map_err(|e| format!("Failed to write PDF file '{}': {}", file_path, e))?;

  Ok(())
}

#[tauri::command]
async fn save_png_to_file(file_path: String, png_data: Vec<u8>) -> Result<(), String> {
  use std::fs;

  fs::write(&file_path, png_data)
    .map_err(|e| format!("Failed to write PNG file '{}': {}", file_path, e))?;

  Ok(())
}

// Text export commands
#[tauri::command]
async fn export_document_as_text(app: tauri::AppHandle, args: ExportTextArgs) -> Result<String, String> {
  use tauri_plugin_dialog::DialogExt;

  let ordering = args.ordering.unwrap_or_else(|| "spatial".to_string());

  // Determine file extension and dialog filter
  let (extension, filter_name, default_name) = match args.format.as_str() {
    "rtf" => ("rtf", "RTF Files", "untitled.rtf"),
    "opml" => ("opml", "OPML Files", "untitled.opml"),
    _ => ("txt", "Text Files", "untitled.txt"),
  };

  let file_path = app.dialog()
    .file()
    .add_filter(filter_name, &[extension])
    .add_filter("All Text Formats", &["txt", "rtf", "opml"])
    .set_file_name(default_name)
    .set_title(&format!("Export as {}", extension.to_uppercase()))
    .blocking_save_file();

  let path = match file_path {
    Some(p) => match p.as_path() {
      Some(path) => path.to_path_buf(),
      None => return Err("Invalid save path selected".into()),
    },
    None => return Err("Export operation cancelled by user".into()),
  };

  // Generate text content based on format
  let content = match args.format.as_str() {
    "rtf" => generate_rtf_content(&args.doc, &ordering)?,
    "opml" => generate_opml_content(&args.doc, &ordering)?,
    _ => generate_txt_content(&args.doc, &ordering)?,
  };

  // Write content to file
  std::fs::write(&path, content)
    .map_err(|e| format!("Failed to write export file '{}': {}", path.display(), e))?;

  Ok(path.to_string_lossy().to_string())
}

fn generate_txt_content(doc: &model::BoardDocument, ordering: &str) -> Result<String, String> {
  let ordered_notes = order_notes_by_heuristic(doc, ordering);

  let mut output = "Freeform Idea Map Export\n".to_string();
  output += &"=".repeat(30);
  output += "\n\n";

  // Add notes
  output += "NOTES:\n\n";
  for (index, note) in ordered_notes.iter().enumerate() {
    output += &format!("{}. {}\n", index + 1, note.text);
    if note.faded.unwrap_or(false) {
      output += "   (faded)\n";
    }
    output += "\n";
  }

  // Add connections with context
  if !doc.connections.is_empty() {
    output += "\nCONNECTIONS:\n\n";
    for (index, conn) in doc.connections.iter().enumerate() {
      if let (Some(src_note), Some(dst_note)) = (
        ordered_notes.iter().find(|n| n.id == conn.src_note_id),
        ordered_notes.iter().find(|n| n.id == conn.dst_note_id)
      ) {
        let src_index = ordered_notes.iter().position(|n| n.id == conn.src_note_id)
          .map(|i| i + 1)
          .unwrap_or(0);
        let dst_index = ordered_notes.iter().position(|n| n.id == conn.dst_note_id)
          .map(|i| i + 1)
          .unwrap_or(0);
        
        // Skip if we couldn't find the note indices
        if src_index == 0 || dst_index == 0 {
          continue;
        }
        
        output += &format!("{}. [{}] → [{}]: \"{}\" → \"{}\"\n",
          index + 1, src_index, dst_index, src_note.text, dst_note.text);
        if let Some(label) = &conn.label {
          output += &format!("   Label: {}\n", label);
        }
        if let Some(style) = &conn.style {
          if let Some(kind) = &style.kind {
            output += &format!("   Style: {}\n", kind);
          }
          if let Some(arrows) = &style.arrows {
            if arrows != "none" {
              output += &format!("   Arrows: {}\n", arrows);
            }
          }
        }
      }
    }
  }

  // Add stacks information
  if !doc.stacks.is_empty() {
    output += "\nSTACKS:\n\n";
    for (index, stack) in doc.stacks.iter().enumerate() {
      output += &format!("{}. Stack ({} notes):\n", index + 1, stack.note_ids.len());
      for note_id in &stack.note_ids {
        if let Some(note) = ordered_notes.iter().find(|n| n.id == *note_id) {
          if let Some(note_index) = ordered_notes.iter().position(|n| n.id == *note_id) {
            output += &format!("   - [{}] {}\n", note_index + 1, note.text);
          }
        }
      }
      output += "\n";
    }
  }

  output += &format!("\nGenerated: {}\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"));
  output += &format!("Ordering: {}\n", ordering);
  output += &format!("{} notes, {} connections\n", doc.notes.len(), doc.connections.len());

  Ok(output)
}

fn generate_rtf_content(doc: &model::BoardDocument, ordering: &str) -> Result<String, String> {
  let ordered_notes = order_notes_by_heuristic(doc, ordering);

  let mut rtf = "{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}".to_string();
  rtf += "{\\colortbl ;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}";
  rtf += "\\fs24\\pard\\qc\\b Freeform Idea Map Export\\b0\\par\\par\\pard\\ql";

  // Notes section
  rtf += "\\b Notes\\b0\\par\\par";
  for (index, note) in ordered_notes.iter().enumerate() {
    rtf += &format!("{}. {}\\par", index + 1, rtf_escape(&note.text));
    if note.faded.unwrap_or(false) {
      rtf += "\\cf1 (faded)\\cf0\\par";
    }
    rtf += "\\par";
  }

  // Connections section
  if !doc.connections.is_empty() {
    rtf += "\\b Connections\\b0\\par\\par";
    for (index, conn) in doc.connections.iter().enumerate() {
      if let (Some(src_note), Some(dst_note)) = (
        ordered_notes.iter().find(|n| n.id == conn.src_note_id),
        ordered_notes.iter().find(|n| n.id == conn.dst_note_id)
      ) {
        let src_index = ordered_notes.iter().position(|n| n.id == conn.src_note_id)
          .map(|i| i + 1)
          .unwrap_or(0);
        let dst_index = ordered_notes.iter().position(|n| n.id == conn.dst_note_id)
          .map(|i| i + 1)
          .unwrap_or(0);
        
        // Skip if we couldn't find the note indices
        if src_index == 0 || dst_index == 0 {
          continue;
        }
        
        rtf += &format!("{}. [{}] → [{}]: {} → {}\\par",
          index + 1, src_index, dst_index,
          rtf_escape(&src_note.text), rtf_escape(&dst_note.text));
        if let Some(label) = &conn.label {
          rtf += &format!("   Label: {}\\par", rtf_escape(label));
        }
      }
    }
  }

  // Metadata
  rtf += "\\par\\par";
  rtf += &format!("Generated: {}\\par", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"));
  rtf += &format!("Ordering: {}\\par", ordering);
  rtf += &format!("{} notes, {} connections\\par", doc.notes.len(), doc.connections.len());
  rtf += "}";

  Ok(rtf)
}

fn generate_opml_content(doc: &model::BoardDocument, ordering: &str) -> Result<String, String> {
  let ordered_notes = order_notes_by_heuristic(doc, ordering);

  let mut opml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n".to_string();
  opml += "<opml version=\"2.0\">\n";
  opml += "  <head>\n";
  opml += "    <title>Freeform Idea Map Export</title>\n";
  opml += &format!("    <dateCreated>{}</dateCreated>\n", chrono::Utc::now().to_rfc3339());
  opml += "    <expansionState>1,2,3</expansionState>\n";
  opml += "  </head>\n";
  opml += "  <body>\n";

  let mut processed = std::collections::HashSet::new();

  // Create hierarchical structure based on connections
  let root_notes: Vec<_> = ordered_notes.iter()
    .filter(|note| !doc.connections.iter().any(|c| c.dst_note_id == note.id))
    .collect();

  // Add root notes and their connections
  for note in root_notes {
    opml += &format!("    <outline text=\"{}\"{}\n",
      opml_escape(&note.text),
      if note.faded.unwrap_or(false) { " _faded=\"true\"" } else { "" });

    if !processed.contains(&note.id) {
      processed.insert(note.id.clone());
      opml += &add_note_to_opml_recursive(note, doc, &ordered_notes, &mut processed, 6)?;
      opml += "    </outline>\n";
    }
  }

  // Add any remaining notes (orphans)
  for note in &ordered_notes {
    if !processed.contains(&note.id) {
      opml += &format!("    <outline text=\"{}\"{}/>\n",
        opml_escape(&note.text),
        if note.faded.unwrap_or(false) { " _faded=\"true\"" } else { "" });
    }
  }

  opml += "  </body>\n";
  opml += "</opml>\n";

  Ok(opml)
}

// Helper functions for text ordering and formatting
fn order_notes_by_heuristic(doc: &model::BoardDocument, ordering: &str) -> Vec<model::Note> {
  match ordering {
    "connections" => order_notes_by_connections(doc),
    "hierarchical" => order_notes_hierarchically(doc),
    _ => order_notes_spatially(doc),
  }
}

fn order_notes_spatially(doc: &model::BoardDocument) -> Vec<model::Note> {
  let mut notes = doc.notes.clone();
  notes.sort_by(|a, b| {
    // Sort by row first, then by column
    let row_a = (a.frame.y / 100.0) as i32; // Group notes in 100px rows
    let row_b = (b.frame.y / 100.0) as i32;
    row_a.cmp(&row_b).then_with(|| a.frame.x.partial_cmp(&b.frame.x).unwrap_or(std::cmp::Ordering::Equal))
  });
  notes
}

fn order_notes_by_connections(doc: &model::BoardDocument) -> Vec<model::Note> {
  let mut ordered = Vec::new();
  let mut processed = std::collections::HashSet::new();

  // Find root notes (no incoming connections)
  let root_notes: Vec<_> = doc.notes.iter()
    .filter(|note| !doc.connections.iter().any(|c| c.dst_note_id == note.id))
    .collect();

  // Process each root note and its connections
  for root in root_notes {
    if !processed.contains(&root.id) {
      ordered.push(root.clone());
      processed.insert(root.id.clone());
      add_connected_notes_recursive(root.id.clone(), doc, &mut ordered, &mut processed);
    }
  }

  // Add any remaining notes (orphans)
  for note in &doc.notes {
    if !processed.contains(&note.id) {
      ordered.push(note.clone());
    }
  }

  ordered
}

fn add_connected_notes_recursive(note_id: String, doc: &model::BoardDocument, ordered: &mut Vec<model::Note>, processed: &mut std::collections::HashSet<String>) {
  let mut outgoing: Vec<_> = doc.connections.iter()
    .filter(|c| c.src_note_id == note_id)
    .collect();

  // Sort by label alphabetically if present, otherwise by destination note text
  outgoing.sort_by(|a, b| {
    let a_label = a.label.as_ref().map(|l| l.as_str()).unwrap_or("");
    let b_label = b.label.as_ref().map(|l| l.as_str()).unwrap_or("");

    if !a_label.is_empty() && !b_label.is_empty() {
      a_label.cmp(b_label)
    } else {
      let a_text = doc.notes.iter()
        .find(|n| n.id == a.dst_note_id)
        .map(|n| n.text.as_str())
        .unwrap_or("");
      let b_text = doc.notes.iter()
        .find(|n| n.id == b.dst_note_id)
        .map(|n| n.text.as_str())
        .unwrap_or("");
      a_text.cmp(b_text)
    }
  });

  for conn in outgoing {
    if !processed.contains(&conn.dst_note_id) {
      if let Some(target_note) = doc.notes.iter().find(|n| n.id == conn.dst_note_id) {
        ordered.push(target_note.clone());
        processed.insert(conn.dst_note_id.clone());
        add_connected_notes_recursive(conn.dst_note_id.clone(), doc, ordered, processed);
      }
    }
  }
}

fn order_notes_hierarchically(doc: &model::BoardDocument) -> Vec<model::Note> {
  let mut ordered = Vec::new();
  let mut processed = std::collections::HashSet::new();

  // First, process stacks in order
  for stack in &doc.stacks {
    for note_id in &stack.note_ids {
      if let Some(note) = doc.notes.iter().find(|n| n.id == *note_id) {
        if !processed.contains(&note.id) {
          ordered.push(note.clone());
          processed.insert(note.id.clone());
        }
      }
    }
  }

  // Then process remaining notes by connections
  let remaining_notes: Vec<_> = doc.notes.iter()
    .filter(|n| !processed.contains(&n.id))
    .cloned()
    .collect();

  let remaining_ordered = order_notes_by_connections(&model::BoardDocument {
    schema_version: doc.schema_version,
    notes: remaining_notes,
    connections: doc.connections.clone(),
    shapes: doc.shapes.clone(),
    stacks: vec![],
    note_styles: doc.note_styles.clone(),
    document_style: doc.document_style.clone(),
    images: doc.images.clone(),
  });

  ordered.extend(remaining_ordered);
  ordered
}

fn rtf_escape(text: &str) -> String {
  text.replace('\\', "\\\\")
    .replace('{', "\\{")
    .replace('}', "\\}")
    .replace('\n', "\\par ")
    .replace('\t', "\\tab ")
}

fn opml_escape(text: &str) -> String {
  text.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&#39;")
}

fn add_note_to_opml_recursive(
  note: &model::Note,
  doc: &model::BoardDocument,
  ordered_notes: &[model::Note],
  processed: &mut std::collections::HashSet<String>,
  indent: usize
) -> Result<String, String> {
  if processed.contains(&note.id) {
    return Ok(String::new());
  }

  let mut opml = String::new();

  // Find children (notes this note connects to)
  let children: Vec<_> = doc.connections.iter()
    .filter(|c| c.src_note_id == note.id)
    .filter_map(|c| ordered_notes.iter().find(|n| n.id == c.dst_note_id))
    .collect();

  if children.is_empty() {
    opml += "/>\n";
  } else {
    opml += ">\n";
    for child in children {
      if !processed.contains(&child.id) {
        processed.insert(child.id.clone());
        opml += &format!("{}<outline text=\"{}\"{}{}\n",
          "  ".repeat(indent / 2 + 1),
          opml_escape(&child.text),
          if child.faded.unwrap_or(false) { " _faded=\"true\"" } else { "" },
          if has_children(&child.id, doc) { "" } else { "/" });

        if has_children(&child.id, doc) {
          opml += &add_note_to_opml_recursive(child, doc, ordered_notes, processed, indent + 2)?;
          opml += &format!("{}</outline>\n", "  ".repeat(indent / 2 + 1));
        } else {
          opml.push('\n');
        }
      }
    }
    opml += &format!("{}</outline>\n", "  ".repeat(indent / 2));
  }

  Ok(opml)
}

fn has_children(note_id: &str, doc: &model::BoardDocument) -> bool {
  doc.connections.iter().any(|c| c.src_note_id == note_id)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init());

  #[cfg(debug_assertions)]
  let builder = builder.plugin(tauri_plugin_devtools::init());

  #[cfg(not(debug_assertions))]
  let builder = builder;

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
      clear_recent_files,
      autosave_document,
      set_document_dirty,
      set_current_document_path,
      get_autosave_status,
      check_recovery_files,
      recover_from_autosave,
      export_document_as_text,
      export_document_as_png,
      save_png_to_file,
      export_document_as_pdf,
      save_pdf_to_file
    ])
    .run(tauri::generate_context!())
    .map_err(|e| {
      eprintln!("Failed to start Tauri application: {}", e);
      std::process::exit(1);
    })
    .unwrap();
}
