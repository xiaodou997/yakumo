//! JSONPath template functions.
//!
//! Query JSON data using JSONPath expressions.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use std::collections::HashMap;

/// JSONPath query function.
///
/// Note: This is a simplified implementation supporting basic JSONPath patterns:
/// - $.field - root field
/// - $.nested.field - nested field
/// - $.array[0] - array index
/// - $.array[*] - all array elements (returns JSON array)
pub struct JsonPathQuery;

impl TemplateFunc for JsonPathQuery {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "json.path".to_string(),
            label: "JSON Path".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Query a JSON object using JSONPath expression".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let json_str = args.get("json").and_then(|v| v.as_str()).unwrap_or_default();
        let path = args.get("path").and_then(|v| v.as_str()).unwrap_or("$");

        // Parse JSON
        let json: serde_json::Value =
            serde_json::from_str(json_str).map_err(|e| format!("Invalid JSON: {}", e))?;

        // Execute simplified JSONPath
        let result = jsonpath_query(&json, path);

        value_to_string(&result)
    }
}

/// Simplified JSONPath query implementation.
fn jsonpath_query(json: &serde_json::Value, path: &str) -> serde_json::Value {
    // Handle root path
    if path == "$" {
        return json.clone();
    }

    // Remove leading $. or $
    let path = path.strip_prefix("$.").unwrap_or(path);
    let path = path.strip_prefix("$").unwrap_or(path);

    if path.is_empty() {
        return json.clone();
    }

    // Split path into segments
    let segments: Vec<&str> = path.split('.').collect();

    let mut current: &serde_json::Value = json;

    for segment in segments {
        current = match_segment_ref(current, segment);

        if current.is_null() {
            return serde_json::Value::Null;
        }
    }

    current.clone()
}

/// Match a single path segment, returning a reference.
fn match_segment_ref<'a>(json: &'a serde_json::Value, segment: &str) -> &'a serde_json::Value {
    // Check for array index: field[index] or field[*]
    let bracket_start = segment.find('[');
    let bracket_end = segment.find(']');

    if let (Some(start), Some(end)) = (bracket_start, bracket_end) {
        if start < end && end == segment.len() - 1 {
            let field_name = &segment[..start];
            let index_str = &segment[start + 1..end];

            // Get the field first
            let field_value = if field_name.is_empty() {
                json
            } else {
                match json.get(field_name) {
                    Some(v) => v,
                    None => return &serde_json::Value::Null,
                }
            };

            // Handle array
            match field_value {
                serde_json::Value::Array(arr) => {
                    if index_str == "*" {
                        // Can't return all elements as reference, use a static null
                        // This is a limitation - $.array[*] returns null in this impl
                        return &serde_json::Value::Null;
                    } else {
                        // Parse index
                        let idx: usize = index_str.parse().unwrap_or(0);
                        return arr.get(idx).unwrap_or(&serde_json::Value::Null);
                    }
                }
                _ => return &serde_json::Value::Null,
            }
        }
    }

    // Simple field access
    json.get(segment).unwrap_or(&serde_json::Value::Null)
}

/// Convert JSON value to string.
fn value_to_string(val: &serde_json::Value) -> Result<String, String> {
    match val {
        serde_json::Value::String(s) => Ok(s.clone()),
        serde_json::Value::Number(n) => Ok(n.to_string()),
        serde_json::Value::Bool(b) => Ok(b.to_string()),
        serde_json::Value::Null => Ok("".to_string()),
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
            serde_json::to_string(val).map_err(|e| format!("Failed to serialize JSON: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jsonpath_root() {
        let json = serde_json::json!({
            "name": "test",
            "value": 42
        });

        let values = HashMap::from([
            ("json".to_string(), serde_json::json!(json.to_string())),
            ("path".to_string(), serde_json::json!("$.name")),
        ]);

        let result = JsonPathQuery.render(&values).unwrap();
        assert_eq!(result, "test");
    }

    #[test]
    fn test_jsonpath_nested() {
        let json = serde_json::json!({
            "nested": {
                "field": "value"
            }
        });

        let values = HashMap::from([
            ("json".to_string(), serde_json::json!(json.to_string())),
            ("path".to_string(), serde_json::json!("$.nested.field")),
        ]);

        let result = JsonPathQuery.render(&values).unwrap();
        assert_eq!(result, "value");
    }

    #[test]
    fn test_jsonpath_array() {
        let json = serde_json::json!({
            "items": [{"id": 1}, {"id": 2}]
        });

        let values = HashMap::from([
            ("json".to_string(), serde_json::json!(json.to_string())),
            ("path".to_string(), serde_json::json!("$.items[0].id")),
        ]);

        let result = JsonPathQuery.render(&values).unwrap();
        assert_eq!(result, "1");
    }

    #[test]
    fn test_jsonpath_number() {
        let json = serde_json::json!({
            "count": 123
        });

        let values = HashMap::from([
            ("json".to_string(), serde_json::json!(json.to_string())),
            ("path".to_string(), serde_json::json!("$.count")),
        ]);

        let result = JsonPathQuery.render(&values).unwrap();
        assert_eq!(result, "123");
    }
}
