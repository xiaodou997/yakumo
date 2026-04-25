//! Encoding template functions.
//!
//! Provides Base64 encoding function.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use std::collections::HashMap;

/// Base64 encode function.
pub struct Base64Encode;

impl TemplateFunc for Base64Encode {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "base64.encode".to_string(),
            label: "Base64 Encode".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Encode text to Base64".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let input = args.get("input").and_then(|v| v.as_str()).unwrap_or_default();
        Ok(BASE64_STANDARD.encode(input.as_bytes()))
    }
}

/// Get all encoding template functions.
pub fn all_encode_functions() -> Vec<TemplateFunction> {
    vec![Base64Encode.definition()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode() {
        let enc = Base64Encode;
        let values = HashMap::from([("input".to_string(), serde_json::json!("hello"))]);
        let result = enc.render(&values).unwrap();
        assert_eq!(result, "aGVsbG8=");
    }
}
