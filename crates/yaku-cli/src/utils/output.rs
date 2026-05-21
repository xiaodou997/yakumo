use serde::Serialize;

pub fn print_json<T: Serialize>(value: &T, context: &str) -> Result<(), String> {
    let output =
        serde_json::to_string(value).map_err(|e| format!("Failed to serialize {context}: {e}"))?;
    println!("{output}");
    Ok(())
}
