//! Timestamp template functions.
//!
//! Provides time-related template functions.

use crate::events::{TemplateFunction, TemplateFunctionPreviewType};
use crate::template::TemplateFunc;
use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;

/// Unix timestamp (seconds) generator.
pub struct TimestampUnix;

impl TemplateFunc for TimestampUnix {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "timestamp.unix".to_string(),
            label: "Timestamp Unix".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Get the current timestamp in seconds".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let date_str = args.get("date").and_then(|v| v.as_str()).unwrap_or_default();

        let dt = parse_date(date_str)?;
        Ok(dt.timestamp().to_string())
    }
}

/// Unix timestamp (milliseconds) generator.
pub struct TimestampUnixMillis;

impl TemplateFunc for TimestampUnixMillis {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "timestamp.unixMillis".to_string(),
            label: "Timestamp Unix Millis".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Get the current timestamp in milliseconds".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let date_str = args.get("date").and_then(|v| v.as_str()).unwrap_or_default();

        let dt = parse_date(date_str)?;
        Ok(dt.timestamp_millis().to_string())
    }
}

/// ISO 8601 format generator.
pub struct TimestampIso8601;

impl TemplateFunc for TimestampIso8601 {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "timestamp.iso8601".to_string(),
            label: "Timestamp ISO 8601".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Get the current date in ISO 8601 format".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let date_str = args.get("date").and_then(|v| v.as_str()).unwrap_or_default();

        let dt = parse_date(date_str)?;
        Ok(dt.to_rfc3339())
    }
}

/// Format timestamp with custom format.
pub struct TimestampFormat;

impl TemplateFunc for TimestampFormat {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "timestamp.format".to_string(),
            label: "Timestamp Format".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Format a timestamp using a custom format string".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let date_str = args.get("date").and_then(|v| v.as_str()).unwrap_or_default();
        let format_str =
            args.get("format").and_then(|v| v.as_str()).unwrap_or("yyyy-MM-dd HH:mm:ss");

        let dt = parse_date(date_str)?;

        // Convert date-fns format to chrono format
        let chrono_format = convert_date_fns_format(format_str);

        Ok(dt.format(&chrono_format).to_string())
    }
}

/// Offset timestamp by expression.
pub struct TimestampOffset;

impl TemplateFunc for TimestampOffset {
    fn definition(&self) -> TemplateFunction {
        TemplateFunction {
            name: "timestamp.offset".to_string(),
            label: "Timestamp Offset".to_string(),
            preview_type: TemplateFunctionPreviewType::Live,
            description: Some("Offset a timestamp by an expression (eg. '-5d +2h 3m')".to_string()),
            aliases: None,
            preview_args: None,
            args: vec![],
        }
    }

    fn render(&self, args: &HashMap<String, serde_json::Value>) -> Result<String, String> {
        let date_str = args.get("date").and_then(|v| v.as_str()).unwrap_or_default();
        let expression = args.get("expression").and_then(|v| v.as_str()).unwrap_or_default();

        let dt = parse_date(date_str)?;
        let offset_dt = apply_offset(dt, expression)?;

        Ok(offset_dt.to_rfc3339())
    }
}

/// Parse date string into DateTime.
fn parse_date(date_str: &str) -> Result<DateTime<Utc>, String> {
    if date_str.is_empty() {
        return Ok(Utc::now());
    }

    // Try ISO format first
    if let Ok(dt) = DateTime::parse_from_rfc3339(date_str) {
        return Ok(dt.with_timezone(&Utc));
    }

    // Try parsing as Unix timestamp (seconds or milliseconds)
    if let Ok(ts) = date_str.parse::<i64>() {
        // If too large, it's probably milliseconds
        let timestamp = if ts > 10000000000 {
            ts / 1000 // milliseconds to seconds
        } else {
            ts
        };

        // Create DateTime from Unix timestamp
        chrono::DateTime::from_timestamp(timestamp, 0)
            .map(|dt| dt.with_timezone(&Utc))
            .ok_or_else(|| format!("Invalid timestamp: {}", date_str))
    } else {
        Ok(Utc::now())
    }
}

/// Apply offset expression to datetime.
fn apply_offset(dt: DateTime<Utc>, expression: &str) -> Result<DateTime<Utc>, String> {
    if expression.is_empty() {
        return Ok(dt);
    }

    let ops = expression.split_whitespace();
    let mut result = dt;

    for op in ops {
        let parsed = parse_offset_op(op)?;
        result = apply_single_offset(result, parsed)?;
    }

    Ok(result)
}

/// Parse a single offset operation.
fn parse_offset_op(op: &str) -> Result<(bool, i64, char), String> {
    // Match pattern like "-5d", "+2h", "3m"
    let re = regex::Regex::new(r"^([+-]?)(\d+)([yMdhms])$").unwrap();

    if let Some(caps) = re.captures(op) {
        let sign = caps.get(1).map(|m| m.as_str()).unwrap_or("+") == "+";
        let amount: i64 = caps
            .get(2)
            .map(|m| m.as_str())
            .unwrap_or("0")
            .parse()
            .map_err(|_| format!("Invalid amount in: {}", op))?;
        let unit = caps.get(3).map(|m| m.as_str().chars().next().unwrap()).unwrap_or('d');

        Ok((sign, amount, unit))
    } else {
        Err(format!("Invalid offset expression: {}", op))
    }
}

/// Apply a single offset to datetime.
fn apply_single_offset(
    dt: DateTime<Utc>,
    (add, amount, unit): (bool, i64, char),
) -> Result<DateTime<Utc>, String> {
    let adjusted = match unit {
        'y' => {
            let years = if add { amount } else { -amount };
            // Approximate year as 365 days
            dt.checked_add_signed(Duration::days(years * 365)).ok_or("Year offset out of range")?
        }
        'M' => {
            let months = if add { amount } else { -amount };
            // Approximate month as 30 days
            dt.checked_add_signed(Duration::days(months * 30)).ok_or("Month offset out of range")?
        }
        'd' => {
            let days = if add { amount } else { -amount };
            dt.checked_add_signed(Duration::days(days)).ok_or("Day offset out of range")?
        }
        'h' => {
            let hours = if add { amount } else { -amount };
            dt.checked_add_signed(Duration::hours(hours)).ok_or("Hour offset out of range")?
        }
        'm' => {
            let minutes = if add { amount } else { -amount };
            dt.checked_add_signed(Duration::minutes(minutes)).ok_or("Minute offset out of range")?
        }
        's' => {
            let seconds = if add { amount } else { -amount };
            dt.checked_add_signed(Duration::seconds(seconds)).ok_or("Second offset out of range")?
        }
        _ => return Err(format!("Invalid unit: {}", unit)),
    };

    Ok(adjusted)
}

/// Convert date-fns format to chrono format.
fn convert_date_fns_format(format: &str) -> String {
    // date-fns uses different format specifiers than chrono
    // Common mappings:
    // yyyy -> %Y (year)
    // MM -> %m (month)
    // dd -> %d (day)
    // HH -> %H (hour 24)
    // mm -> %M (minute)
    // ss -> %S (second)

    format
        .replace("yyyy", "%Y")
        .replace("yy", "%y")
        .replace("MM", "%m")
        .replace("M", "%m")
        .replace("dd", "%d")
        .replace("d", "%d")
        .replace("HH", "%H")
        .replace("H", "%H")
        .replace("hh", "%I")
        .replace("h", "%I")
        .replace("mm", "%M")
        .replace("m", "%M")
        .replace("ss", "%S")
        .replace("s", "%S")
        .replace("a", "%P")
        .replace("Z", "%:z")
}

/// Get all timestamp template functions.
pub fn all_timestamp_functions() -> Vec<TemplateFunction> {
    vec![
        TimestampUnix.definition(),
        TimestampUnixMillis.definition(),
        TimestampIso8601.definition(),
        TimestampFormat.definition(),
        TimestampOffset.definition(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_unix_now() {
        let ts = TimestampUnix;
        let result = ts.render(&HashMap::new()).unwrap();
        let secs: i64 = result.parse().unwrap();
        let now = Utc::now().timestamp();
        assert!(secs > 0 && secs <= now + 1);
    }

    #[test]
    fn test_timestamp_iso8601() {
        let ts = TimestampIso8601;
        let result = ts.render(&HashMap::new()).unwrap();
        // RFC3339 is valid ISO8601, uses +00:00 instead of Z
        assert!(result.contains('T'));
        // Either Z or +00:00 is valid
        assert!(result.contains('Z') || result.contains("+00:00"));
    }

    #[test]
    fn test_timestamp_format() {
        let ts = TimestampFormat;
        let values = HashMap::from([("format".to_string(), serde_json::json!("yyyy-MM-dd"))]);
        let result = ts.render(&values).unwrap();
        // Should be something like 2024-01-15
        assert!(result.contains('-'));
    }

    #[test]
    fn test_timestamp_offset() {
        let ts = TimestampOffset;
        let values = HashMap::from([("expression".to_string(), serde_json::json!("+1d"))]);
        let result = ts.render(&values).unwrap();
        // Should be ISO8601 format
        assert!(result.contains('T'));
    }
}
