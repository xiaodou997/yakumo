use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ToastColor {
    Danger,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ShowToastRequest {
    pub(crate) message: String,
    pub(crate) color: Option<ToastColor>,
    pub(crate) icon: Option<String>,
    pub(crate) timeout: Option<i32>,
}
