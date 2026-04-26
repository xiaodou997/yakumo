//! Regex template functions.
//!
//! Perform regex operations on strings.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use regex::Regex;
use std::collections::HashMap;

/// Regex match function.
pub struct RegexMatch;

impl TemplateFunc for RegexMatch {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "regex.match".to_string(),
            label: "Regex Match".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Check if a string matches a regex pattern".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let text = args
            .get("text")
            .or_else(|| args.get("input"))
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let pattern = args.get("pattern").and_then(|v| v.as_str()).unwrap_or_default();

        let re = Regex::new(pattern).map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re.is_match(text).to_string())
    }
}

/// Regex extract function.
pub struct RegexExtract;

impl TemplateFunc for RegexExtract {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "regex.extract".to_string(),
            label: "Regex Extract".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Extract first match from a string using regex".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let text = args
            .get("text")
            .or_else(|| args.get("input"))
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let pattern = args.get("pattern").and_then(|v| v.as_str()).unwrap_or_default();
        let group_index = args.get("group").and_then(|v| v.as_u64()).unwrap_or(0) as usize;

        let re = Regex::new(pattern).map_err(|e| format!("Invalid regex pattern: {}", e))?;

        let match_result = re.captures(text);

        match match_result {
            Some(caps) => {
                if group_index == 0 {
                    // Return entire match
                    Ok(caps.get(0).map(|m| m.as_str()).unwrap_or_default().to_string())
                } else {
                    // Return specific group
                    Ok(caps.get(group_index).map(|m| m.as_str()).unwrap_or_default().to_string())
                }
            }
            None => Ok("".to_string()),
        }
    }
}

/// Regex replace function.
pub struct RegexReplace;

impl TemplateFunc for RegexReplace {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "regex.replace".to_string(),
            label: "Regex Replace".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Replace matches in a string using regex".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let text = args
            .get("text")
            .or_else(|| args.get("input"))
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let pattern = args.get("pattern").and_then(|v| v.as_str()).unwrap_or_default();
        let replacement = args.get("replacement").and_then(|v| v.as_str()).unwrap_or_default();

        let re = Regex::new(pattern).map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re.replace_all(text, replacement).to_string())
    }
}

/// Get all regex template functions.
pub fn all_regex_functions() -> Vec<TemplateFunction> {
    vec![
        RegexMatch.definition(),
        RegexExtract.definition(),
        RegexReplace.definition(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regex_match() {
        let values = HashMap::from([
            ("text".to_string(), serde_json::json!("hello123world")),
            ("pattern".to_string(), serde_json::json!("\\d+")),
        ]);

        let result = RegexMatch.render(&values).unwrap();
        assert_eq!(result, "true");
    }

    #[test]
    fn test_regex_no_match() {
        let values = HashMap::from([
            ("text".to_string(), serde_json::json!("hello world")),
            ("pattern".to_string(), serde_json::json!("\\d+")),
        ]);

        let result = RegexMatch.render(&values).unwrap();
        assert_eq!(result, "false");
    }

    #[test]
    fn test_regex_extract() {
        let values = HashMap::from([
            ("text".to_string(), serde_json::json!("hello123world")),
            ("pattern".to_string(), serde_json::json!("(\\d+)")),
            ("group".to_string(), serde_json::json!(1)),
        ]);

        let result = RegexExtract.render(&values).unwrap();
        assert_eq!(result, "123");
    }

    #[test]
    fn test_regex_replace() {
        let values = HashMap::from([
            ("text".to_string(), serde_json::json!("hello123world456")),
            ("pattern".to_string(), serde_json::json!("\\d+")),
            ("replacement".to_string(), serde_json::json!("X")),
        ]);

        let result = RegexReplace.render(&values).unwrap();
        assert_eq!(result, "helloXworldX");
    }
}
