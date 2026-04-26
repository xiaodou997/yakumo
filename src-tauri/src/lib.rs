extern crate core;
use crate::models_ext::QueryManagerExt;
use crate::notifications::YakumoNotifier;
use crate::updates::YakumoUpdater;
use crate::uri_scheme::handle_deep_link;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use log::{debug, info, warn};
use std::collections::HashMap;
use std::time::Duration;
use tauri::{Emitter, RunEvent, State, is_dev};
use tauri::{Manager, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::fern::colors::ColoredLevelConfig;
use tauri_plugin_log::{Builder, Target, TargetKind, log};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use tokio::sync::Mutex;
use tokio::time;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_features::events::{Color, ShowToastRequest};
use yakumo_grpc::manager::GrpcHandle;
use yakumo_mac_window::AppHandleMacWindowExt;
use yakumo_templates::TemplateCallback;

mod commands;
mod encoding;
mod error;
mod file_commands;
mod formatting;
mod git_ext;
mod grpc;
mod grpc_commands;
mod history;
mod http_request;
mod import;
mod metadata_commands;
mod models_ext;
mod notifications;
mod path_guard;
mod render;
mod sync_ext;
mod template_commands;
mod update_commands;
mod updates;
mod uri_scheme;
mod window;
mod window_commands;
mod window_menu;
mod ws_ext;

/// Built-in template callback that implements TemplateCallback trait
/// using native Rust implementations.
#[derive(Clone, Default)]
pub struct BuiltinTemplateCallback {
    encryption_manager: Option<EncryptionManager>,
    workspace_id: Option<String>,
}

impl BuiltinTemplateCallback {
    pub fn for_workspace(
        encryption_manager: EncryptionManager,
        workspace_id: impl Into<String>,
    ) -> Self {
        Self {
            encryption_manager: Some(encryption_manager),
            workspace_id: Some(workspace_id.into()),
        }
    }
}

impl TemplateCallback for BuiltinTemplateCallback {
    async fn run(
        &self,
        fn_name: &str,
        args: HashMap<String, serde_json::Value>,
    ) -> yakumo_templates::error::Result<String> {
        use yakumo_features::template::*;

        // Dispatch to appropriate template function
        match fn_name {
            // UUID functions
            "uuid.v4" => uuid::UuidV4
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v7" => uuid::UuidV7
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v3" => uuid::UuidV3
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "uuid.v5" => uuid::UuidV5
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Timestamp functions
            "timestamp.unix" => timestamp::TimestampUnix
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.unixMillis" => timestamp::TimestampUnixMillis
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.iso8601" => timestamp::TimestampIso8601
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.format" => timestamp::TimestampFormat
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "timestamp.offset" => timestamp::TimestampOffset
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Hash functions
            "hash.sha256" => hash::HashSha256
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Encode functions
            "base64.encode" => encode::Base64Encode
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Random functions (only RandomString available)
            "random.string" => random::RandomString
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // JSONPath functions
            "jsonpath.query" => jsonpath::JsonPathQuery
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            // Regex functions
            "regex.match" => regex::RegexMatch
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "regex.extract" => regex::RegexExtract
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "regex.replace" => regex::RegexReplace
                .render(&args)
                .map_err(|e| yakumo_templates::error::Error::RenderError(e)),
            "secure" => {
                let value = args.get("value").and_then(|v| v.as_str()).ok_or_else(|| {
                    yakumo_templates::error::Error::RenderError(
                        "secure() requires a value argument".to_string(),
                    )
                })?;
                let Some(encryption_manager) = &self.encryption_manager else {
                    return Ok(value.to_string());
                };
                let Some(workspace_id) = &self.workspace_id else {
                    return Ok(value.to_string());
                };
                let encrypted = BASE64_STANDARD.decode(value).map_err(|e| {
                    yakumo_templates::error::Error::RenderError(format!(
                        "Failed to decode secure template: {e}"
                    ))
                })?;
                let decrypted = encryption_manager
                    .decrypt(workspace_id, &encrypted)
                    .map_err(|e| yakumo_templates::error::Error::RenderError(e.to_string()))?;
                String::from_utf8(decrypted).map_err(|e| {
                    yakumo_templates::error::Error::RenderError(format!(
                        "Secure template is not valid UTF-8: {e}"
                    ))
                })
            }
            _ => Err(yakumo_templates::error::Error::RenderError(format!(
                "Unknown template function: {fn_name}"
            ))),
        }
    }

    fn transform_arg(
        &self,
        _fn_name: &str,
        _arg_name: &str,
        arg_value: &str,
    ) -> yakumo_templates::error::Result<String> {
        Ok(arg_value.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(
        Builder::default()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::LogDir { file_name: None }),
                Target::new(TargetKind::Webview),
            ])
            .level_for("plugin_runtime", log::LevelFilter::Info)
            .level_for("cookie_store", log::LevelFilter::Info)
            .level_for("eventsource_client::event_parser", log::LevelFilter::Info)
            .level_for("h2", log::LevelFilter::Info)
            .level_for("hyper", log::LevelFilter::Info)
            .level_for("hyper_util", log::LevelFilter::Info)
            .level_for("hyper_rustls", log::LevelFilter::Info)
            .level_for("reqwest", log::LevelFilter::Info)
            .level_for("sqlx", log::LevelFilter::Debug)
            .level_for("tao", log::LevelFilter::Info)
            .level_for("tokio_util", log::LevelFilter::Info)
            .level_for("tonic", log::LevelFilter::Info)
            .level_for("tower", log::LevelFilter::Info)
            .level_for("tracing", log::LevelFilter::Warn)
            .level_for("swc_ecma_codegen", log::LevelFilter::Off)
            .level_for("swc_ecma_transforms_base", log::LevelFilter::Off)
            .with_colors(ColoredLevelConfig::default())
            .level(if is_dev() { log::LevelFilter::Debug } else { log::LevelFilter::Info })
            .build(),
    );

    // Only enable single-instance in production builds. In dev mode, we want to allow
    // multiple instances for testing and worktree workflows (running multiple branches).
    if !is_dev() {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When trying to open a new app instance (common operation on Linux),
            // focus the first existing window we find instead of opening a new one
            // TODO: Keep track of the last focused window and always focus that one
            if let Some(window) = app.webview_windows().values().next() {
                let _ = window.set_focus();
            }
        }));
    }

    builder = builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        // Don't restore StateFlags::DECORATIONS because we want to be able to toggle them on/off on a restart
        // We could* make this work if we toggled them in the frontend before the window closes, but, this is nicer.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all() - StateFlags::DECORATIONS)
                .build(),
        )
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(yakumo_mac_window::init())
        .plugin(models_ext::init()) // Database setup only
        .plugin(yakumo_fonts::init());

    #[cfg(feature = "license")]
    {
        builder = builder.plugin(yakumo_license::init());
    }

    #[cfg(feature = "updater")]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::default().build());
    }

    builder
        .setup(|app| {
            // Initialize HTTP connection manager
            app.manage(yakumo_http::manager::HttpConnectionManager::new());

            // Initialize encryption manager
            let query_manager =
                app.state::<yakumo_models::query_manager::QueryManager>().inner().clone();
            let app_id = app.config().identifier.to_string();
            app.manage(yakumo_crypto::manager::EncryptionManager::new(query_manager, app_id));

            {
                let app_handle = app.app_handle().clone();
                app.deep_link().on_open_url(move |event| {
                    info!("Handling deep link open");
                    let app_handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        for url in event.urls() {
                            if let Err(e) = handle_deep_link(&app_handle, &url).await {
                                warn!("Failed to handle deep link {}: {e:?}", url.to_string());
                                let _ = app_handle.emit(
                                    "show_toast",
                                    ShowToastRequest {
                                        message: format!(
                                            "Error handling deep link: {}",
                                            e.to_string()
                                        ),
                                        color: Some(Color::Danger),
                                        icon: None,
                                        timeout: None,
                                    },
                                );
                            };
                        }
                    });
                });
            };

            // Add updater
            let yakumo_updater = YakumoUpdater::new();
            app.manage(Mutex::new(yakumo_updater));

            // Add notifier
            let yakumo_notifier = YakumoNotifier::new();
            app.manage(Mutex::new(yakumo_notifier));

            // Add GRPC manager
            let grpc_handle = GrpcHandle::new();
            app.manage(Mutex::new(grpc_handle));

            // Add WebSocket manager
            let ws_manager = yakumo_ws::WebsocketManager::new();
            app.manage(Mutex::new(ws_manager));

            // Specific settings
            let settings = app.db().get_settings();
            app.app_handle().set_native_titlebar(settings.use_native_titlebar);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_commands::cmd_check_for_updates,
            history::cmd_delete_all_grpc_connections,
            history::cmd_delete_all_http_responses,
            history::cmd_delete_send_history,
            notifications::cmd_dismiss_notification,
            file_commands::cmd_export_data,
            http_request::cmd_http_request_body,
            file_commands::cmd_http_response_body_bytes,
            file_commands::cmd_directory_is_empty,
            formatting::cmd_format_json,
            formatting::cmd_format_graphql,
            formatting::cmd_format_xml,
            formatting::cmd_format_html,
            file_commands::cmd_get_sse_events,
            file_commands::cmd_get_http_response_events,
            models_ext::models_get_workspace_meta,
            grpc_commands::cmd_grpc_go,
            grpc_commands::cmd_grpc_reflect,
            file_commands::cmd_import_data,
            metadata_commands::cmd_metadata,
            window_commands::cmd_new_child_window,
            window_commands::cmd_new_main_window,
            template_commands::cmd_render_template,
            window_commands::cmd_restart,
            file_commands::cmd_save_response,
            http_request::cmd_send_ephemeral_request,
            http_request::cmd_send_http_request,
            template_commands::cmd_template_tokens_to_string,
            //
            //
            // Migrated commands
            crate::commands::cmd_decrypt_template,
            crate::commands::cmd_default_headers,
            crate::commands::cmd_disable_encryption,
            crate::commands::cmd_enable_encryption,
            crate::commands::cmd_get_http_authentication_summaries,
            crate::commands::cmd_get_http_authentication_config,
            crate::commands::cmd_get_themes,
            crate::commands::cmd_call_folder_action,
            crate::commands::cmd_call_grpc_request_action,
            crate::commands::cmd_call_http_request_action,
            crate::commands::cmd_call_websocket_request_action,
            crate::commands::cmd_call_workspace_action,
            crate::commands::cmd_curl_to_request,
            crate::commands::cmd_folder_actions,
            crate::commands::cmd_grpc_request_actions,
            crate::commands::cmd_http_request_actions,
            crate::commands::cmd_http_response_body,
            crate::commands::cmd_reveal_workspace_key,
            crate::commands::cmd_secure_template,
            crate::commands::cmd_set_workspace_key,
            crate::commands::cmd_template_function_config,
            crate::commands::cmd_template_function_summaries,
            crate::commands::cmd_websocket_request_actions,
            crate::commands::cmd_workspace_actions,
            //
            // Models commands
            models_ext::models_delete,
            models_ext::models_duplicate,
            models_ext::models_get_graphql_introspection,
            models_ext::models_get_settings,
            models_ext::models_grpc_events,
            models_ext::models_upsert,
            models_ext::models_upsert_graphql_introspection,
            models_ext::models_websocket_events,
            models_ext::models_workspace_models,
            //
            // Sync commands
            sync_ext::cmd_sync_calculate,
            sync_ext::cmd_sync_calculate_fs,
            sync_ext::cmd_sync_apply,
            sync_ext::cmd_sync_apply_fs,
            sync_ext::cmd_sync_watch,
            //
            // Git commands
            git_ext::cmd_git_workspace_checkout,
            git_ext::cmd_git_workspace_branch,
            git_ext::cmd_git_workspace_delete_branch,
            git_ext::cmd_git_workspace_delete_remote_branch,
            git_ext::cmd_git_workspace_merge_branch,
            git_ext::cmd_git_workspace_rename_branch,
            git_ext::cmd_git_workspace_status,
            git_ext::cmd_git_workspace_log,
            git_ext::cmd_git_workspace_initialize,
            git_ext::cmd_git_clone,
            git_ext::cmd_git_workspace_commit,
            git_ext::cmd_git_workspace_fetch_all,
            git_ext::cmd_git_workspace_push,
            git_ext::cmd_git_workspace_pull,
            git_ext::cmd_git_workspace_pull_force_reset,
            git_ext::cmd_git_workspace_pull_merge,
            git_ext::cmd_git_workspace_add,
            git_ext::cmd_git_workspace_unstage,
            git_ext::cmd_git_workspace_reset_changes,
            git_ext::cmd_git_add_credential,
            git_ext::cmd_git_workspace_remotes,
            git_ext::cmd_git_workspace_add_remote,
            git_ext::cmd_git_workspace_rm_remote,
            //
            // WebSocket commands
            ws_ext::cmd_ws_delete_connections,
            ws_ext::cmd_ws_send,
            ws_ext::cmd_ws_close,
            ws_ext::cmd_ws_connect,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Ready => {
                    let _ = window::create_main_window(app_handle, "/");
                    let h = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let info = history::get_or_upsert_launch_info(&h);
                        debug!("Launched Yakumo {:?}", info);
                    });

                    // Cancel pending requests
                    let h = app_handle.clone();
                    tauri::async_runtime::block_on(async move {
                        let db = h.db();
                        let _ = db.cancel_pending_http_responses();
                        let _ = db.cancel_pending_grpc_connections();
                        let _ = db.cancel_pending_websocket_connections();
                    });
                }
                RunEvent::WindowEvent { event: WindowEvent::Focused(true), label, .. } => {
                    if cfg!(feature = "updater") {
                        // Run update check whenever the window is focused
                        let w = app_handle.get_webview_window(&label).unwrap();
                        let h = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            let settings = w.db().get_settings();
                            if settings.autoupdate {
                                time::sleep(Duration::from_secs(3)).await; // Wait a bit so it's not so jarring
                                let val: State<'_, Mutex<YakumoUpdater>> = h.state();
                                let update_mode =
                                    update_commands::get_update_mode(&w).await.unwrap();
                                if let Err(e) = val
                                    .lock()
                                    .await
                                    .maybe_check(&w, settings.auto_download_updates, update_mode)
                                    .await
                                {
                                    warn!("Failed to check for updates {e:?}");
                                }
                            };
                        });
                    }

                    let h = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let windows = h.webview_windows();
                        let w = windows.values().next().unwrap();
                        tokio::time::sleep(Duration::from_millis(4000)).await;
                        let val: State<'_, Mutex<YakumoNotifier>> = w.state();
                        let mut n = val.lock().await;
                        if let Err(e) = n.maybe_check(&w).await {
                            warn!("Failed to check for notifications {}", e)
                        }
                    });
                }
                RunEvent::WindowEvent { event: WindowEvent::CloseRequested { .. }, .. } => {
                    if let Err(e) = app_handle.save_window_state(StateFlags::all()) {
                        warn!("Failed to save window state {e:?}");
                    } else {
                        info!("Saved window state");
                    };
                }
                _ => {}
            };
        });
}

pub(crate) fn safe_uri(endpoint: &str) -> String {
    if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        endpoint.into()
    } else {
        format!("http://{}", endpoint)
    }
}
