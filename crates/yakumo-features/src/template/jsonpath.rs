//! JSONPath template functions.
//!
//! Query JSON data using JSONPath expressions.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::filters;
use crate::template::TemplateFunc;
use std::collections::HashMap;

pub struct JsonPathQuery;

impl TemplateFunc for JsonPathQuery {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "jsonpath.query".to_string(),
            label: "JSONPath Query".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Query a JSON object using a JSONPath expression".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let json_str = args.get("json").and_then(|v| v.as_str()).unwrap_or_default();
        let path = args.get("path").and_then(|v| v.as_str()).unwrap_or("$");
        filters::apply_jsonpath(json_str, path)
    }
}

#[cfg(test)]
mod tests {
    use super::JsonPathQuery;
    use crate::template::TemplateFunc;
    use std::collections::HashMap;

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
    fn test_jsonpath_wildcard() {
        let json = serde_json::json!({
            "items": [{"id": 1}, {"id": 2}]
        });

        let values = HashMap::from([
            ("json".to_string(), serde_json::json!(json.to_string())),
            ("path".to_string(), serde_json::json!("$.items[*].id")),
        ]);

        let result = JsonPathQuery.render(&values).unwrap();
        assert_eq!(result, "[1,2]");
    }
}
