use serde::{Deserialize, Serialize};

pub type ID = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
  pub x: f32,
  pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rect {
  pub x: f32,
  pub y: f32,
  pub w: f32,
  pub h: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteStyle {
  pub id: ID,
  #[serde(default)]
  pub textStyle: TextStyle,
  #[serde(default)]
  pub fill: Option<String>,
  #[serde(default)]
  pub border: Option<Border>,
  #[serde(default)]
  pub cornerRadius: Option<f32>,
  #[serde(default)]
  pub shadow: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TextStyle {
  pub font: String,
  pub size: f32,
  #[serde(default)]
  pub weight: Option<u32>,
  #[serde(default)]
  pub italic: Option<bool>,
  #[serde(default)]
  pub underline: Option<bool>,
  #[serde(default)]
  pub strike: Option<bool>,
  #[serde(default)]
  pub color: Option<String>,
  #[serde(default)]
  pub align: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Border {
  #[serde(default)]
  pub color: Option<String>,
  #[serde(default)]
  pub width: Option<f32>,
  #[serde(default)]
  pub style: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentStyle {
  #[serde(default)]
  pub background: Option<Background>,
  #[serde(default)]
  pub defaultNoteStyleId: Option<ID>,
  #[serde(default)]
  pub defaultShapeStyleId: Option<ID>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Background {
  #[serde(default)]
  pub color: Option<String>,
  #[serde(default)]
  pub textureId: Option<ID>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddedImage {
  pub id: ID,
  pub mime: String,
  pub width: u32,
  pub height: u32,
  #[serde(default)]
  pub data: Option<String>,
  #[serde(default)]
  pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStyle {
  #[serde(default)]
  pub kind: Option<String>,
  #[serde(default)]
  pub arrows: Option<String>,
  #[serde(default)]
  pub color: Option<String>,
  #[serde(default)]
  pub width: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
  pub id: ID,
  pub srcNoteId: ID,
  pub dstNoteId: ID,
  #[serde(default)]
  pub style: Option<ConnectionStyle>,
  #[serde(default)]
  pub label: Option<String>,
  #[serde(default)]
  pub bendPoints: Option<Vec<Point>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundShape {
  pub id: ID,
  pub frame: Rect,
  #[serde(default)]
  pub radius: Option<f32>,
  #[serde(default)]
  pub magnetic: Option<bool>,
  #[serde(default)]
  pub styleId: Option<ID>,
  #[serde(default)]
  pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stack {
  pub id: ID,
  pub noteIds: Vec<ID>,
  #[serde(default)]
  pub orientation: Option<String>,
  #[serde(default)]
  pub spacing: Option<f32>,
  #[serde(default)]
  pub indentLevels: Option<std::collections::HashMap<ID, u32>>,
  #[serde(default)]
  pub alignedWidth: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
  pub id: ID,
  pub text: String,
  pub frame: Rect,
  #[serde(default)]
  pub styleId: Option<ID>,
  #[serde(default)]
  pub faded: Option<bool>,
  #[serde(default)]
  pub stackId: Option<ID>,
  #[serde(default)]
  pub links: Option<Vec<String>>,
  #[serde(default)]
  pub images: Option<Vec<ID>>,
  #[serde(default)]
  pub connections: Option<Vec<ID>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardDocument {
  pub schemaVersion: u32,
  #[serde(default)]
  pub notes: Vec<Note>,
  #[serde(default)]
  pub connections: Vec<Connection>,
  #[serde(default)]
  pub shapes: Vec<BackgroundShape>,
  #[serde(default)]
  pub stacks: Vec<Stack>,
  #[serde(default)]
  pub noteStyles: Vec<NoteStyle>,
  #[serde(default)]
  pub documentStyle: Option<DocumentStyle>,
  #[serde(default)]
  pub images: Option<Vec<EmbeddedImage>>,
}

