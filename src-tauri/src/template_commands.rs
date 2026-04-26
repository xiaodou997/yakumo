//! Tauri commands for template rendering.

use crate::BuiltinTemplateCallback;
use crate::error::Result as YakumoResult;
use crate::models_ext::QueryManagerExt;
use crate::render::render_template;
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::events::RenderPurpose;
use yakumo_templates::{RenderErrorBehavior, RenderOptions, Tokens, transform_args};

#[tauri::command]
pub(crate) async fn cmd_template_tokens_to_string<R: Runtime>(
    _window: WebviewWindow<R>,
    _app_handle: AppHandle<R>,
    tokens: Tokens,
) -> YakumoResult<String> {
    let cb = BuiltinTemplateCallback::default();
    let new_tokens = transform_args(tokens, &cb)?;
    Ok(new_tokens.to_string())
}

#[tauri::command]
pub(crate) async fn cmd_render_template<R: Runtime>(
    _window: WebviewWindow<R>,
    app_handle: AppHandle<R>,
    template: &str,
    workspace_id: &str,
    environment_id: Option<&str>,
    _purpose: Option<RenderPurpose>,
    ignore_error: Option<bool>,
) -> YakumoResult<String> {
    let environment_chain =
        app_handle.db().resolve_environments(workspace_id, None, environment_id)?;
    let cb = BuiltinTemplateCallback::for_workspace(
        app_handle.state::<EncryptionManager>().inner().clone(),
        workspace_id,
    );
    let result = render_template(
        template,
        environment_chain,
        &cb,
        &RenderOptions {
            error_behavior: match ignore_error {
                Some(true) => RenderErrorBehavior::ReturnEmpty,
                _ => RenderErrorBehavior::Throw,
            },
        },
    )
    .await?;
    Ok(result)
}
