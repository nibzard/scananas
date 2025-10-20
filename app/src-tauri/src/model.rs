use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type ID = String;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(dead_code)]  // Reserved for future use (note resizing, etc.)
pub struct Size {
    pub w: f64,
    pub h: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TextStyle {
    pub font: String,
    pub size: f64,
    pub weight: Option<u32>,
    pub italic: Option<bool>,
    pub underline: Option<bool>,
    pub strike: Option<bool>,
    pub color: Option<String>,
    pub align: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NoteStyle {
    pub id: ID,
    #[serde(rename = "textStyle")]
    pub text_style: TextStyle,
    pub fill: Option<String>,
    pub border: Option<BorderStyle>,
    #[serde(rename = "cornerRadius")]
    pub corner_radius: Option<f64>,
    pub shadow: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BorderStyle {
    pub color: Option<String>,
    pub width: Option<f64>,
    pub style: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DocumentStyle {
    pub background: Option<BackgroundStyle>,
    #[serde(rename = "defaultNoteStyleId")]
    pub default_note_style_id: Option<ID>,
    #[serde(rename = "defaultShapeStyleId")]
    pub default_shape_style_id: Option<ID>,
    pub grid: Option<GridStyle>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BackgroundStyle {
    pub color: Option<String>,
    #[serde(rename = "textureId")]
    pub texture_id: Option<ID>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GridStyle {
    pub visible: bool,
    pub snap: bool,
    pub size: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EmbeddedImage {
    pub id: ID,
    pub mime: String,
    pub width: f64,
    pub height: f64,
    #[serde(rename = "dataBase64")]
    pub data_base64: Option<String>,
    pub path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConnectionStyle {
    pub kind: Option<String>,
    pub arrows: Option<String>,
    pub color: Option<String>,
    pub width: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Connection {
    pub id: ID,
    #[serde(rename = "srcNoteId")]
    pub src_note_id: ID,
    #[serde(rename = "dstNoteId")]
    pub dst_note_id: ID,
    pub style: Option<ConnectionStyle>,
    pub label: Option<String>,
    #[serde(rename = "bendPoints")]
    pub bend_points: Option<Vec<Point>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BackgroundShape {
    pub id: ID,
    pub frame: Rect,
    pub radius: Option<f64>,
    pub magnetic: Option<bool>,
    #[serde(rename = "styleId")]
    pub style_id: Option<ID>,
    pub label: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Stack {
    pub id: ID,
    #[serde(rename = "noteIds")]
    pub note_ids: Vec<ID>,
    pub orientation: Option<String>,
    pub spacing: Option<f64>,
    #[serde(rename = "indentLevels")]
    pub indent_levels: Option<HashMap<ID, u32>>,
    #[serde(rename = "alignedWidth")]
    pub aligned_width: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Note {
    pub id: ID,
    pub text: String,
    #[serde(rename = "richAttrs")]
    pub rich_attrs: Option<HashMap<String, serde_json::Value>>,
    pub frame: Rect,
    #[serde(rename = "styleId")]
    pub style_id: Option<ID>,
    pub faded: Option<bool>,
    #[serde(rename = "stackId")]
    pub stack_id: Option<ID>,
    pub links: Option<Vec<String>>,
    pub images: Option<Vec<ID>>,
    pub connections: Option<Vec<ID>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BoardDocument {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub notes: Vec<Note>,
    pub connections: Vec<Connection>,
    pub shapes: Vec<BackgroundShape>,
    pub stacks: Vec<Stack>,
    #[serde(rename = "noteStyles")]
    pub note_styles: Vec<NoteStyle>,
    #[serde(rename = "documentStyle")]
    pub document_style: Option<DocumentStyle>,
    pub images: Option<Vec<EmbeddedImage>>,
}
