//! Themes modules for Yakumo API.
//!
//! This module provides built-in theme configuration
//! implemented as native Yakumo features.

use crate::events::{Theme, ThemeComponentColors};

/// Get the default Yakumo theme.
pub fn default_theme() -> Theme {
    Theme {
        id: "yakumo-default".to_string(),
        label: "Yakumo Default".to_string(),
        dark: false,
        base: ThemeComponentColors {
            surface: Some("#ffffff".to_string()),
            surface_highlight: Some("#f5f5f5".to_string()),
            surface_active: Some("#e5e5e5".to_string()),
            text: Some("#333333".to_string()),
            text_subtle: Some("#666666".to_string()),
            ..Default::default()
        },
        components: None,
    }
}

/// Get the dark Yakumo theme.
pub fn dark_theme() -> Theme {
    Theme {
        id: "yakumo-dark".to_string(),
        label: "Yakumo Dark".to_string(),
        dark: true,
        base: ThemeComponentColors {
            surface: Some("#1e1e2e".to_string()),
            surface_highlight: Some("#2d2d3d".to_string()),
            surface_active: Some("#3d3d4d".to_string()),
            text: Some("#cdd6f4".to_string()),
            text_subtle: Some("#bac2de".to_string()),
            ..Default::default()
        },
        components: None,
    }
}

/// Get all built-in themes.
pub fn all_themes() -> Vec<Theme> {
    vec![default_theme(), dark_theme()]
}
