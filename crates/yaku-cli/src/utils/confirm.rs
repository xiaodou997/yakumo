use std::io::{self, IsTerminal, Write};

pub fn confirm_delete(resource_name: &str, resource_id: &str) -> Result<bool, String> {
    if !io::stdin().is_terminal() {
        return Err("Refusing to delete in non-interactive mode without --yes".to_string());
    }

    print!("Delete {resource_name} {resource_id}? [y/N]: ");
    io::stdout().flush().map_err(|e| format!("Failed to flush delete confirmation prompt: {e}"))?;

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .map_err(|e| format!("Failed to read delete confirmation: {e}"))?;

    Ok(matches!(input.trim().to_lowercase().as_str(), "y" | "yes"))
}
