use crate::error::{Error, Result};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

pub fn render_config(
    config: BTreeMap<String, Value>,
    variables: &BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>> {
    config.into_iter().map(|(key, value)| Ok((key, render_value(value, variables)?))).collect()
}

pub fn render_value(value: Value, variables: &BTreeMap<String, Value>) -> Result<Value> {
    match value {
        Value::String(value) => render_string(&value, variables).map(Value::String),
        Value::Array(values) => values
            .into_iter()
            .map(|value| render_value(value, variables))
            .collect::<Result<Vec<_>>>()
            .map(Value::Array),
        Value::Object(values) => values
            .into_iter()
            .map(|(key, value)| Ok((key, render_value(value, variables)?)))
            .collect::<Result<Map<_, _>>>()
            .map(Value::Object),
        value => Ok(value),
    }
}

fn render_string(input: &str, variables: &BTreeMap<String, Value>) -> Result<String> {
    let mut output = String::with_capacity(input.len());
    let mut remainder = input;

    while let Some(start) = remainder.find("${[") {
        output.push_str(&remainder[..start]);
        let expression_start = start + 3;
        let expression_remainder = &remainder[expression_start..];
        let end = expression_remainder
            .find("]}")
            .ok_or_else(|| Error::InvalidConfig("unterminated template expression".to_string()))?;
        let name = expression_remainder[..end].trim();
        if name.is_empty() {
            return Err(Error::InvalidConfig("empty template variable name".to_string()));
        }
        let value = variables
            .get(name)
            .ok_or_else(|| Error::InvalidConfig(format!("missing template variable '{name}'")))?;
        output.push_str(&variable_to_string(value));
        remainder = &expression_remainder[end + 2..];
    }

    output.push_str(remainder);
    Ok(output)
}

fn variable_to_string(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(value) => value.clone(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::Array(_) | Value::Object(_) => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn renders_nested_config_strings() {
        let mut variables = BTreeMap::new();
        variables.insert("base_url".to_string(), json!("https://example.test"));
        variables.insert("token".to_string(), json!("abc"));
        variables.insert("retry".to_string(), json!(2));
        let config = BTreeMap::from([
            ("url".to_string(), json!("${[ base_url ]}/health")),
            (
                "headers".to_string(),
                json!([{ "name": "Authorization", "value": "Bearer ${[ token ]}" }]),
            ),
            ("body".to_string(), json!("{\"retry\":${[ retry ]}}")),
        ]);

        let rendered = render_config(config, &variables).expect("config rendered");

        assert_eq!(rendered["url"], json!("https://example.test/health"));
        assert_eq!(rendered["headers"][0]["value"], json!("Bearer abc"));
        assert_eq!(rendered["body"], json!("{\"retry\":2}"));
    }

    #[test]
    fn rejects_missing_variables() {
        let err = render_value(json!("${[ missing ]}"), &BTreeMap::new()).expect_err("missing");
        assert!(err.to_string().contains("missing template variable"));
    }
}
