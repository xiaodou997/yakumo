//! Hash template functions.
//!
//! Provides SHA256 hash function.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// SHA256 hash function.
pub struct HashSha256;

impl TemplateFunc for HashSha256 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "hash.sha256".to_string(),
            label: "Hash SHA256".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Hash a value using SHA256".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let input = args.get("input").and_then(|v| v.as_str()).unwrap_or_default();

        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        let hash_bytes = hasher.finalize();

        Ok(BASE64_STANDARD.encode(&hash_bytes))
    }
}

/// Get all hash template functions.
pub fn all_hash_functions() -> Vec<TemplateFunction> {
    vec![HashSha256.definition()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256() {
        let hash = HashSha256;
        let values = HashMap::from([("input".to_string(), serde_json::json!("hello"))]);
        let result = hash.render(&values).unwrap();
        assert!(!result.is_empty());
    }
}
