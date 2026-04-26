pub fn format_xml(text: &str, indent: &str) -> String {
    let input = text.trim();
    if input.is_empty() {
        return text.to_string();
    }

    let tokens = tokenize_xml(input);
    if tokens.len() <= 1 {
        return text.to_string();
    }

    let mut level = 0usize;
    let mut lines = Vec::with_capacity(tokens.len());

    for token in tokens {
        let trimmed = token.trim();
        if trimmed.is_empty() {
            continue;
        }

        let is_closing = trimmed.starts_with("</");
        let is_declaration = trimmed.starts_with("<?");
        let is_comment_or_doctype = trimmed.starts_with("<!")
            || trimmed.starts_with("<!--")
            || trimmed.starts_with("<![CDATA[");
        let is_self_closing = trimmed.ends_with("/>")
            || is_declaration
            || is_comment_or_doctype
            || is_inline_element(trimmed);

        if is_closing {
            level = level.saturating_sub(1);
        }

        lines.push(format!("{}{}", indent.repeat(level), trimmed));

        if trimmed.starts_with('<') && !is_closing && !is_self_closing {
            level += 1;
        }
    }

    lines.join("\n")
}

fn tokenize_xml(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut chars = input.chars().peekable();
    let mut in_tag = false;

    while let Some(ch) = chars.next() {
        match ch {
            '<' => {
                if !current.trim().is_empty() {
                    tokens.push(current.trim().to_string());
                    current.clear();
                }
                current.push(ch);
                in_tag = true;
            }
            '>' if in_tag => {
                current.push(ch);
                tokens.push(current.trim().to_string());
                current.clear();
                in_tag = false;
            }
            _ => {
                current.push(ch);
            }
        }
    }

    if !current.trim().is_empty() {
        tokens.push(current.trim().to_string());
    }

    tokens
}

fn is_inline_element(token: &str) -> bool {
    if !token.starts_with('<') || token.starts_with("</") {
        return false;
    }

    let Some(close_tag_start) = token.rfind("</") else {
        return false;
    };
    let open_tag_end = token.find('>').unwrap_or(0);

    close_tag_start > open_tag_end
}

#[cfg(test)]
mod tests {
    use super::format_xml;

    #[test]
    fn formats_nested_xml() {
        let xml = "<root><item id=\"1\">value</item><empty/></root>";

        assert_eq!(
            format_xml(xml, "  "),
            "<root>\n  <item id=\"1\">\n    value\n  </item>\n  <empty/>\n</root>"
        );
    }

    #[test]
    fn preserves_plain_text() {
        assert_eq!(format_xml("not xml", "  "), "not xml");
    }
}
