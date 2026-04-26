use mime_guess::{Mime, mime};
use std::str::FromStr;

pub fn decode_response_body(body: &[u8], content_type: &str) -> String {
    let body_charset = parse_charset(content_type).unwrap_or("utf-8".to_string());
    if let Some(decoder) = charset::Charset::for_label(body_charset.as_bytes()) {
        let (cow, _real_encoding, _exist_replace) = decoder.decode(&body);
        return cow.into_owned();
    }

    String::from_utf8_lossy(&body).to_string()
}

fn parse_charset(content_type: &str) -> Option<String> {
    let mime: Mime = Mime::from_str(content_type).ok()?;
    mime.get_param(mime::CHARSET).map(|v| v.to_string())
}
