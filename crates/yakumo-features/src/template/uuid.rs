//! UUID template functions.
//!
//! Generates UUID v4 and v7 (most commonly used).

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use std::collections::HashMap;
use uuid::Uuid;

/// UUID v4 (random) generator - most commonly used.
pub struct UuidV4;

impl TemplateFunc for UuidV4 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "uuid.v4".to_string(),
            label: "UUID v4".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Generate a UUID V4 (random)".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, _args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        Ok(Uuid::new_v4().to_string())
    }
}

/// UUID v7 (modern time-based) generator.
pub struct UuidV7;

impl TemplateFunc for UuidV7 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "uuid.v7".to_string(),
            label: "UUID v7".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Generate a UUID V7 (modern time-based)".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, _args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        Ok(Uuid::now_v7().to_string())
    }
}

/// UUID v3 (name-based with MD5) generator.
pub struct UuidV3;

impl TemplateFunc for UuidV3 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "uuid.v3".to_string(),
            label: "UUID v3".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Generate a UUID V3 (name-based with MD5)".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let name = args.get("name").and_then(|v| v.as_str()).unwrap_or_default();
        let namespace_str = args
            .get("namespace")
            .and_then(|v| v.as_str())
            .unwrap_or("6ba7b810-9dad-11d1-80b4-00c04fd430c8"); // DNS namespace

        let namespace =
            Uuid::parse_str(namespace_str).map_err(|e| format!("Invalid namespace UUID: {}", e))?;

        Ok(Uuid::new_v3(&namespace, name.as_bytes()).to_string())
    }
}

/// UUID v5 (name-based with SHA-1) generator.
pub struct UuidV5;

impl TemplateFunc for UuidV5 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "uuid.v5".to_string(),
            label: "UUID v5".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Generate a UUID V5 (name-based with SHA-1)".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let name = args.get("name").and_then(|v| v.as_str()).unwrap_or_default();
        let namespace_str = args
            .get("namespace")
            .and_then(|v| v.as_str())
            .unwrap_or("6ba7b810-9dad-11d1-80b4-00c04fd430c8"); // DNS namespace

        let namespace =
            Uuid::parse_str(namespace_str).map_err(|e| format!("Invalid namespace UUID: {}", e))?;

        Ok(Uuid::new_v5(&namespace, name.as_bytes()).to_string())
    }
}

/// Get all UUID template functions.
pub fn all_uuid_functions() -> Vec<TemplateFunction> {
    vec![
        UuidV3.definition(),
        UuidV4.definition(),
        UuidV5.definition(),
        UuidV7.definition(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uuid_v4() {
        let uuid = UuidV4;
        let result = uuid.render(&HashMap::new()).unwrap();
        assert!(Uuid::parse_str(&result).is_ok());
    }

    #[test]
    fn test_uuid_v7() {
        let uuid = UuidV7;
        let result = uuid.render(&HashMap::new()).unwrap();
        assert!(Uuid::parse_str(&result).is_ok());
    }

    #[test]
    fn test_uuid_v3_with_namespace() {
        let uuid = UuidV3;
        let values = HashMap::from([
            ("name".to_string(), serde_json::json!("example.com")),
            ("namespace".to_string(), serde_json::json!("6ba7b810-9dad-11d1-80b4-00c04fd430c8")),
        ]);
        let result = uuid.render(&values).unwrap();
        // UUID v3 is deterministic for same name and namespace
        assert!(Uuid::parse_str(&result).is_ok());
    }

    #[test]
    fn test_uuid_v5_with_namespace() {
        let uuid = UuidV5;
        let values = HashMap::from([
            ("name".to_string(), serde_json::json!("example.com")),
            ("namespace".to_string(), serde_json::json!("6ba7b810-9dad-11d1-80b4-00c04fd430c8")),
        ]);
        let result = uuid.render(&values).unwrap();
        assert!(Uuid::parse_str(&result).is_ok());
    }
}
