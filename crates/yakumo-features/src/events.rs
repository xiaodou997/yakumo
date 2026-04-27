//! Event types and data structures for Yakumo API.
//!
//! This module contains types used for communication between
//! the frontend and backend, as well as theme definitions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;
use yakumo_models::models::{
    Environment, Folder, GrpcRequest, HttpRequest, WebsocketRequest, Workspace,
};

// ============================================================================
// Toast Notifications
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_events.ts")]
pub enum Color {
    Primary,
    Secondary,
    Info,
    Success,
    Notice,
    Warning,
    Danger,
}

impl Default for Color {
    fn default() -> Self {
        Color::Secondary
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_events.ts")]
pub enum Icon {
    AlertTriangle,
    Check,
    CheckCircle,
    ChevronDown,
    Copy,
    Info,
    Pin,
    Search,
    Trash,

    #[serde(untagged)]
    #[ts(type = "\"_unknown\"")]
    _Unknown(String),
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct ShowToastRequest {
    pub message: String,

    #[ts(optional)]
    pub color: Option<Color>,

    #[ts(optional)]
    pub icon: Option<Icon>,

    #[ts(optional)]
    pub timeout: Option<i32>,
}

// ============================================================================
// Themes
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct ThemeComponents {
    #[ts(optional)]
    pub dialog: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub menu: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub toast: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub sidebar: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub response_pane: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub app_header: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub button: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub banner: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub template_tag: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub url_bar: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub editor: Option<ThemeComponentColors>,
    #[ts(optional)]
    pub input: Option<ThemeComponentColors>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct ThemeComponentColors {
    #[ts(optional)]
    pub surface: Option<String>,
    #[ts(optional)]
    pub surface_highlight: Option<String>,
    #[ts(optional)]
    pub surface_active: Option<String>,

    #[ts(optional)]
    pub text: Option<String>,
    #[ts(optional)]
    pub text_subtle: Option<String>,
    #[ts(optional)]
    pub text_subtlest: Option<String>,

    #[ts(optional)]
    pub border: Option<String>,
    #[ts(optional)]
    pub border_subtle: Option<String>,
    #[ts(optional)]
    pub border_focus: Option<String>,

    #[ts(optional)]
    pub shadow: Option<String>,
    #[ts(optional)]
    pub backdrop: Option<String>,
    #[ts(optional)]
    pub selection: Option<String>,

    #[ts(optional)]
    pub primary: Option<String>,
    #[ts(optional)]
    pub secondary: Option<String>,
    #[ts(optional)]
    pub info: Option<String>,
    #[ts(optional)]
    pub success: Option<String>,
    #[ts(optional)]
    pub notice: Option<String>,
    #[ts(optional)]
    pub warning: Option<String>,
    #[ts(optional)]
    pub danger: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct Theme {
    /// How the theme is identified. This should never be changed
    pub id: String,
    /// The friendly name of the theme to be displayed to the user
    pub label: String,
    /// Whether the theme will be used for dark or light appearance
    pub dark: bool,
    /// The default top-level colors for the theme
    pub base: ThemeComponentColors,
    /// Optionally override theme for individual UI components for more control
    #[ts(optional)]
    pub components: Option<ThemeComponents>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct GetThemesResponse {
    pub themes: Vec<Theme>,
}

// ============================================================================
// HTTP Request Types
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct HttpHeader {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_events.ts")]
pub enum JsonPrimitive {
    String(String),
    Number(f64),
    Boolean(bool),
    Null,
}

impl From<serde_json::Value> for JsonPrimitive {
    fn from(value: serde_json::Value) -> Self {
        match value {
            serde_json::Value::Null => JsonPrimitive::Null,
            serde_json::Value::Bool(b) => JsonPrimitive::Boolean(b),
            serde_json::Value::Number(n) => JsonPrimitive::Number(n.as_f64().unwrap()),
            serde_json::Value::String(s) => JsonPrimitive::String(s),
            v => panic!("Unsupported JSON primitive type {:?}", v),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct CallHttpAuthenticationRequest {
    pub context_id: String,
    pub values: HashMap<String, JsonPrimitive>,
    pub method: String,
    pub url: String,
    pub headers: Vec<HttpHeader>,
}

// ============================================================================
// Template Functions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_events.ts")]
pub enum TemplateFunctionPreviewType {
    Text,
    Json,
    Live,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct TemplateFunction {
    pub name: String,
    pub label: String,
    pub description: Option<String>,
    pub args: Vec<TemplateFunctionArg>,
    pub preview_type: TemplateFunctionPreviewType,
    #[ts(optional)]
    pub aliases: Option<Vec<String>>,
    #[ts(optional)]
    pub preview_args: Option<Vec<TemplateFunctionArg>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct TemplateFunctionArg {
    pub name: String,
    pub label: Option<String>,
    pub description: Option<String>,
    pub type_name: String,
    pub optional: bool,
    pub default_value: Option<serde_json::Value>,
    pub help_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct FormInput {
    pub input_type: String,
    pub label: String,
    pub help_url: Option<String>,
    #[ts(optional)]
    pub description: Option<String>,
    #[ts(optional)]
    pub placeholder: Option<String>,
    #[ts(optional)]
    pub required: Option<bool>,
    #[ts(optional)]
    pub secret: Option<bool>,
    #[ts(optional)]
    pub multiline: Option<bool>,
}

// ============================================================================
// Import
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct ImportResources {
    pub workspaces: Vec<Workspace>,
    pub environments: Vec<Environment>,
    pub http_requests: Vec<HttpRequest>,
    pub websocket_requests: Vec<WebsocketRequest>,
    pub grpc_requests: Vec<GrpcRequest>,
    pub folders: Vec<Folder>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct ImportResponse {
    pub resources: Option<ImportResources>,
    pub error: Option<String>,
}

// ============================================================================
// Template Rendering
// ============================================================================

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "gen_events.ts")]
pub enum RenderPurpose {
    #[default]
    Preview,
    Send,
}

// ============================================================================
// HTTP Authentication
// ============================================================================

/// Summary of an available authentication type
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct HttpAuthenticationSummary {
    /// Unique identifier for this auth type (e.g., "basic", "bearer")
    pub name: String,
    /// Friendly display name
    pub label: String,
    /// Optional description
    #[ts(optional)]
    pub description: Option<String>,
}

/// Configuration for a specific authentication type
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct HttpAuthenticationConfig {
    /// Arguments/inputs for this auth type
    pub args: Vec<FormInput>,
    /// Optional actions that can be performed
    #[ts(optional)]
    pub actions: Option<Vec<AuthAction>>,
    /// Source registry ID for the built-in auth provider.
    #[ts(optional)]
    pub source_id: Option<String>,
}

/// An action that can be performed on an auth configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "gen_events.ts")]
pub struct AuthAction {
    pub label: String,
    #[ts(optional)]
    pub icon: Option<String>,
}
