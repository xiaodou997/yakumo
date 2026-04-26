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

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let length = match args.get("length") {
            Some(value) => match value {
                serde_json::Value::Number(number) => number
                    .as_u64()
                    .ok_or_else(|| "length must be a positive integer".to_string())?
                    as usize,
                serde_json::Value::String(value) if !value.trim().is_empty() => value
                    .parse::<usize>()
                    .map_err(|_| "length must be a positive integer".to_string())?,
                serde_json::Value::String(_) | serde_json::Value::Null => 16,
                _ => return Err("length must be a positive integer".to_string()),
            },
            None => 16,
        };

        if length == 0 {
            return Err("length must be greater than 0".to_string());
        }

        let mut rng = rand::rng();
        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let value: String = (0..length)
            .map(|_| chars.chars().nth(rng.random_range(0..chars.len())).unwrap())
            .collect();

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

    #[test]
    fn test_random_string_custom_length() {
        let rand = RandomString;
        let result =
            rand.render(&HashMap::from([("length".to_string(), serde_json::json!("24"))])).unwrap();
        assert_eq!(result.len(), 24);
    }
}
