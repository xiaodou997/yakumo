use crate::filters::Filter;
use quick_xml::Reader;
use quick_xml::events::Event;
use std::collections::BTreeMap;

pub struct XPathFilter;

impl Filter for XPathFilter {
    fn name(&self) -> &str {
        "xpath"
    }

    fn apply(&self, content: &str, expression: &str) -> Result<String, String> {
        let expression = expression.trim();
        if expression.is_empty() {
            return Ok(content.to_string());
        }

        let root = parse_xml(content)?;
        let steps = parse_xpath(expression)?;
        let mut current = vec![XPathValue::Node(&root)];

        for (index, step) in steps.iter().enumerate() {
            current = evaluate_step(&current, step, index == 0);
        }

        render_values(&current)
    }
}

#[derive(Debug, Clone, Default)]
struct XmlNode {
    name: String,
    attributes: BTreeMap<String, String>,
    text: String,
    children: Vec<XmlNode>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Axis {
    Child,
    Descendant,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Selector {
    Element(String),
    Wildcard,
    Attribute(String),
    Text,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Step {
    axis: Axis,
    selector: Selector,
    index: Option<usize>,
}

#[derive(Debug, Clone)]
enum XPathValue<'a> {
    Node(&'a XmlNode),
    Text(String),
}

fn parse_xml(content: &str) -> Result<XmlNode, String> {
    let mut reader = Reader::from_str(content);
    reader.config_mut().trim_text(true);

    let mut stack: Vec<XmlNode> = Vec::new();
    let mut root: Option<XmlNode> = None;

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) => {
                let name = String::from_utf8_lossy(event.local_name().as_ref()).into_owned();
                let mut node = XmlNode { name, ..Default::default() };
                for attr in event.attributes() {
                    let attr = attr.map_err(|e| format!("Invalid XML attribute: {e}"))?;
                    let key = String::from_utf8_lossy(attr.key.as_ref()).into_owned();
                    let value = attr
                        .decode_and_unescape_value(reader.decoder())
                        .map_err(|e| format!("Invalid XML attribute value: {e}"))?
                        .into_owned();
                    node.attributes.insert(key, value);
                }
                stack.push(node);
            }
            Ok(Event::Empty(event)) => {
                let name = String::from_utf8_lossy(event.local_name().as_ref()).into_owned();
                let mut node = XmlNode { name, ..Default::default() };
                for attr in event.attributes() {
                    let attr = attr.map_err(|e| format!("Invalid XML attribute: {e}"))?;
                    let key = String::from_utf8_lossy(attr.key.as_ref()).into_owned();
                    let value = attr
                        .decode_and_unescape_value(reader.decoder())
                        .map_err(|e| format!("Invalid XML attribute value: {e}"))?
                        .into_owned();
                    node.attributes.insert(key, value);
                }
                push_child(&mut stack, &mut root, node);
            }
            Ok(Event::Text(event)) => {
                if let Some(node) = stack.last_mut() {
                    let text = event
                        .decode()
                        .map_err(|e| format!("Invalid XML text node: {e}"))?
                        .into_owned();
                    if !text.is_empty() {
                        if !node.text.is_empty() {
                            node.text.push(' ');
                        }
                        node.text.push_str(&text);
                    }
                }
            }
            Ok(Event::CData(event)) => {
                if let Some(node) = stack.last_mut() {
                    let text = event
                        .decode()
                        .map_err(|e| format!("Invalid XML CDATA node: {e}"))?
                        .into_owned();
                    if !text.is_empty() {
                        if !node.text.is_empty() {
                            node.text.push(' ');
                        }
                        node.text.push_str(&text);
                    }
                }
            }
            Ok(Event::End(_)) => {
                let Some(node) = stack.pop() else {
                    return Err("Malformed XML: unexpected closing tag".to_string());
                };
                push_child(&mut stack, &mut root, node);
            }
            Ok(Event::Eof) => break,
            Ok(
                Event::Decl(_)
                | Event::PI(_)
                | Event::Comment(_)
                | Event::DocType(_)
                | Event::GeneralRef(_),
            ) => {}
            Err(err) => return Err(format!("Invalid XML response body: {err}")),
        }
    }

    if !stack.is_empty() {
        return Err("Malformed XML: unclosed tags remain".to_string());
    }

    root.ok_or_else(|| "XML response body did not contain any elements".to_string())
}

fn push_child(stack: &mut [XmlNode], root: &mut Option<XmlNode>, node: XmlNode) {
    if let Some(parent) = stack.last_mut() {
        parent.children.push(node);
    } else {
        *root = Some(node);
    }
}

fn parse_xpath(expression: &str) -> Result<Vec<Step>, String> {
    if !expression.starts_with('/') {
        return Err("XPath must start with '/' or '//'".to_string());
    }

    let bytes = expression.as_bytes();
    let mut i = 0;
    let mut steps = Vec::new();

    while i < bytes.len() {
        let axis = if bytes[i] as char == '/' {
            if i + 1 < bytes.len() && bytes[i + 1] as char == '/' {
                i += 2;
                Axis::Descendant
            } else {
                i += 1;
                Axis::Child
            }
        } else {
            return Err("XPath contains an unexpected token".to_string());
        };

        if i >= bytes.len() {
            break;
        }

        let start = i;
        while i < bytes.len() && bytes[i] as char != '/' {
            i += 1;
        }
        let token = expression[start..i].trim();
        if token.is_empty() {
            return Err("XPath contains an empty segment".to_string());
        }

        let (selector, index) = parse_step_token(token)?;
        steps.push(Step { axis, selector, index });
    }

    Ok(steps)
}

fn parse_step_token(token: &str) -> Result<(Selector, Option<usize>), String> {
    if token == "*" {
        return Ok((Selector::Wildcard, None));
    }
    if token == "text()" {
        return Ok((Selector::Text, None));
    }
    if let Some(name) = token.strip_prefix('@') {
        if name.is_empty() {
            return Err("XPath attribute selector must include a name".to_string());
        }
        return Ok((Selector::Attribute(name.to_string()), None));
    }

    if let Some(open) = token.find('[') {
        let close = token
            .rfind(']')
            .ok_or_else(|| "XPath predicate is missing a closing ']'".to_string())?;
        let selector = &token[..open];
        let predicate = token[open + 1..close].trim();
        let index = predicate
            .parse::<usize>()
            .map_err(|_| format!("Unsupported XPath predicate: [{predicate}]"))?;
        if selector.is_empty() {
            return Err("XPath predicate must follow an element name".to_string());
        }
        return Ok((Selector::Element(selector.to_string()), Some(index)));
    }

    Ok((Selector::Element(token.to_string()), None))
}

fn evaluate_step<'a>(
    current: &[XPathValue<'a>],
    step: &Step,
    is_first_step: bool,
) -> Vec<XPathValue<'a>> {
    let mut matches = Vec::new();
    for value in current {
        let XPathValue::Node(node) = value else {
            continue;
        };

        match step.axis {
            Axis::Child => {
                if is_first_step && node_matches_selector(node, &step.selector) {
                    matches.push(XPathValue::Node(node));
                } else {
                    collect_child_matches(node, &step.selector, &mut matches);
                }
            }
            Axis::Descendant => collect_descendant_matches(node, &step.selector, &mut matches),
        }
    }

    if let Some(index) = step.index {
        if index == 0 {
            return Vec::new();
        }
        matches.into_iter().nth(index - 1).into_iter().collect()
    } else {
        matches
    }
}

fn collect_child_matches<'a>(
    node: &'a XmlNode,
    selector: &Selector,
    matches: &mut Vec<XPathValue<'a>>,
) {
    match selector {
        Selector::Element(name) => matches
            .extend(node.children.iter().filter(|child| child.name == *name).map(XPathValue::Node)),
        Selector::Wildcard => matches.extend(node.children.iter().map(XPathValue::Node)),
        Selector::Attribute(name) => {
            if let Some(value) = node.attributes.get(name) {
                matches.push(XPathValue::Text(value.clone()));
            }
        }
        Selector::Text => {
            if !node.text.is_empty() {
                matches.push(XPathValue::Text(node.text.clone()));
            }
        }
    }
}

fn collect_descendant_matches<'a>(
    node: &'a XmlNode,
    selector: &Selector,
    matches: &mut Vec<XPathValue<'a>>,
) {
    for child in &node.children {
        collect_node_match(child, selector, matches);
        collect_descendant_matches(child, selector, matches);
    }
}

fn collect_node_match<'a>(
    node: &'a XmlNode,
    selector: &Selector,
    matches: &mut Vec<XPathValue<'a>>,
) {
    match selector {
        Selector::Element(name) => {
            if node.name == *name {
                matches.push(XPathValue::Node(node));
            }
        }
        Selector::Wildcard => matches.push(XPathValue::Node(node)),
        Selector::Attribute(name) => {
            if let Some(value) = node.attributes.get(name) {
                matches.push(XPathValue::Text(value.clone()));
            }
        }
        Selector::Text => {
            if !node.text.is_empty() {
                matches.push(XPathValue::Text(node.text.clone()));
            }
        }
    }
}

fn node_matches_selector(node: &XmlNode, selector: &Selector) -> bool {
    match selector {
        Selector::Element(name) => node.name == *name,
        Selector::Wildcard => true,
        Selector::Attribute(name) => node.attributes.contains_key(name),
        Selector::Text => !node.text.is_empty(),
    }
}

fn render_values(values: &[XPathValue<'_>]) -> Result<String, String> {
    if values.is_empty() {
        return Ok(String::new());
    }

    let rendered = values
        .iter()
        .map(|value| match value {
            XPathValue::Node(node) => serialize_node(node),
            XPathValue::Text(text) => Ok(text.clone()),
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rendered.join("\n"))
}

fn serialize_node(node: &XmlNode) -> Result<String, String> {
    let mut output = String::new();
    output.push('<');
    output.push_str(&node.name);
    for (key, value) in &node.attributes {
        output.push(' ');
        output.push_str(key);
        output.push_str("=\"");
        output.push_str(value);
        output.push('"');
    }

    if node.children.is_empty() && node.text.is_empty() {
        output.push_str("/>");
        return Ok(output);
    }

    output.push('>');
    if !node.text.is_empty() {
        output.push_str(&node.text);
    }
    for child in &node.children {
        output.push_str(&serialize_node(child)?);
    }
    output.push_str("</");
    output.push_str(&node.name);
    output.push('>');
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::XPathFilter;
    use crate::filters::Filter;

    #[test]
    fn filters_xml_text() {
        let xml = r#"<root><user><name>yakumo</name></user></root>"#;
        let result = XPathFilter.apply(xml, "/root/user/name/text()").unwrap();
        assert_eq!(result, "yakumo");
    }

    #[test]
    fn filters_xml_attribute() {
        let xml = r#"<root><user id="42">yakumo</user></root>"#;
        let result = XPathFilter.apply(xml, "/root/user/@id").unwrap();
        assert_eq!(result, "42");
    }

    #[test]
    fn filters_xml_descendants() {
        let xml = r#"<root><group><item>A</item></group><item>B</item></root>"#;
        let result = XPathFilter.apply(xml, "//item/text()").unwrap();
        assert_eq!(result, "A\nB");
    }
}
