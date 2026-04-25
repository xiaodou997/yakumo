//! Random template functions.
//!
//! Provides random number and random string generation.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use rand::Rng;
use std::collections::HashMap;

/// Random string generator.
pub struct RandomString;

impl TemplateFunc for RandomString {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "random.string".to_string(),
            label: "Random String".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Generate a random alphanumeric string".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, _args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let mut rng = rand::rng();
        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let value: String =
            (0..16).map(|_| chars.chars().nth(rng.random_range(0..chars.len())).unwrap()).collect();

        Ok(value)
    }
}

/// Get all random template functions.
pub fn all_random_functions() -> Vec<TemplateFunction> {
    vec![RandomString.definition()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_string() {
        let rand = RandomString;
        let result = rand.render(&HashMap::new()).unwrap();
        assert_eq!(result.len(), 16);
        assert!(result.chars().all(|c| c.is_alphanumeric()));
    }
}
