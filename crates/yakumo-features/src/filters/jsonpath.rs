use crate::filters::Filter;
use serde_json::Value;

pub struct JsonPathFilter;

impl Filter for JsonPathFilter {
    fn name(&self) -> &str {
        "jsonpath"
    }

    fn apply(&self, content: &str, expression: &str) -> Result<String, String> {
        let expression = expression.trim();
        if expression.is_empty() {
            return Ok(content.to_string());
        }

        let json: Value = serde_json::from_str(content)
            .map_err(|e| format!("Invalid JSON response body: {e}"))?;
        let segments = parse_jsonpath(expression)?;
        let mut current = vec![&json];

        for segment in segments {
            current = match segment {
                Segment::Key(key) => current
                    .into_iter()
                    .filter_map(|value| value.as_object().and_then(|obj| obj.get(&key)))
                    .collect(),
                Segment::Index(index) => current
                    .into_iter()
                    .filter_map(|value| value.as_array().and_then(|arr| arr.get(index)))
                    .collect(),
                Segment::Wildcard => current
                    .into_iter()
                    .flat_map(|value| match value {
                        Value::Array(items) => items.iter().collect::<Vec<_>>(),
                        Value::Object(entries) => entries.values().collect::<Vec<_>>(),
                        _ => Vec::new(),
                    })
                    .collect(),
            };
        }

        render_matches(&current)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Segment {
    Key(String),
    Index(usize),
    Wildcard,
}

fn parse_jsonpath(path: &str) -> Result<Vec<Segment>, String> {
    let path = path.trim();
    if path == "$" {
        return Ok(vec![]);
    }
    let path = path.strip_prefix('$').ok_or_else(|| "JSONPath must start with '$'".to_string())?;

    let bytes = path.as_bytes();
    let mut i = 0;
    let mut segments = Vec::new();

    while i < bytes.len() {
        match bytes[i] as char {
            '.' => {
                i += 1;
                if i >= bytes.len() {
                    return Err("JSONPath cannot end with '.'".to_string());
                }
                if bytes[i] as char == '*' {
                    segments.push(Segment::Wildcard);
                    i += 1;
                    continue;
                }

                let start = i;
                while i < bytes.len() && !matches!(bytes[i] as char, '.' | '[') {
                    i += 1;
                }
                let key = &path[start..i];
                if key.is_empty() {
                    return Err("JSONPath contains an empty property segment".to_string());
                }
                segments.push(Segment::Key(key.to_string()));
            }
            '[' => {
                i += 1;
                let start = i;
                while i < bytes.len() && bytes[i] as char != ']' {
                    i += 1;
                }
                if i >= bytes.len() {
                    return Err("JSONPath has an unterminated '[' segment".to_string());
                }
                let token = path[start..i].trim();
                i += 1;

                if token == "*" {
                    segments.push(Segment::Wildcard);
                    continue;
                }

                if let Some(stripped) = token.strip_prefix('\'').and_then(|v| v.strip_suffix('\''))
                {
                    segments.push(Segment::Key(stripped.to_string()));
                    continue;
                }
                if let Some(stripped) = token.strip_prefix('"').and_then(|v| v.strip_suffix('"')) {
                    segments.push(Segment::Key(stripped.to_string()));
                    continue;
                }

                let index = token
                    .parse::<usize>()
                    .map_err(|_| format!("Unsupported JSONPath segment: [{token}]"))?;
                segments.push(Segment::Index(index));
            }
            other => {
                return Err(format!("Unsupported JSONPath token '{other}'"));
            }
        }
    }

    Ok(segments)
}

fn render_matches(matches: &[&Value]) -> Result<String, String> {
    match matches {
        [] => Ok(String::new()),
        [value] => render_value(value),
        values => {
            let collected: Vec<Value> = values.iter().map(|value| (*value).clone()).collect();
            serde_json::to_string(&collected)
                .map_err(|e| format!("Failed to serialize JSONPath result: {e}"))
        }
    }
}

fn render_value(value: &Value) -> Result<String, String> {
    match value {
        Value::Null => Ok(String::new()),
        Value::Bool(v) => Ok(v.to_string()),
        Value::Number(v) => Ok(v.to_string()),
        Value::String(v) => Ok(v.clone()),
        Value::Array(_) | Value::Object(_) => serde_json::to_string(value)
            .map_err(|e| format!("Failed to serialize JSONPath result: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::JsonPathFilter;
    use crate::filters::Filter;

    #[test]
    fn filters_nested_json_value() {
        let content = r#"{"user":{"name":"yakumo","roles":["admin","dev"]}}"#;
        let result = JsonPathFilter.apply(content, "$.user.name").unwrap();
        assert_eq!(result, "yakumo");
    }

    #[test]
    fn filters_array_wildcard() {
        let content = r#"{"users":[{"name":"a"},{"name":"b"}]}"#;
        let result = JsonPathFilter.apply(content, "$.users[*].name").unwrap();
        assert_eq!(result, r#"["a","b"]"#);
    }

    #[test]
    fn rejects_invalid_jsonpath() {
        let content = r#"{"ok":true}"#;
        let err = JsonPathFilter.apply(content, "users[0]").unwrap_err();
        assert!(err.contains("must start with '$'"));
    }
}
