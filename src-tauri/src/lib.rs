extern crate core;
use crate::notifications::YakumoNotifier;
use crate::updates::YakumoUpdater;
use crate::uri_scheme::handle_deep_link;
use crate::yaku_app_settings::load_yaku_app_settings;
use events::{ShowToastRequest, ToastColor};
use log::{debug, info, warn};
use std::time::Duration;
use tauri::{Emitter, RunEvent, State, is_dev};
use tauri::{Manager, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::fern::colors::ColoredLevelConfig;
use tauri_plugin_log::{Builder, Target, TargetKind, log};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use tokio::sync::Mutex;
use tokio::time;
use yakumo_mac_window::AppHandleMacWindowExt;

mod error;
mod events;
mod formatting;
mod history;
mod metadata_commands;
mod notifications;
mod path_guard;
mod update_commands;
mod updates;
mod uri_scheme;
mod window;
mod window_commands;
mod window_menu;
mod yaku_app_settings;
mod yaku_commands;

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
        .plugin(yakumo_fonts::init());

    #[cfg(feature = "updater")]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::default().build());
    }

    builder
        .setup(|app| {
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
                                        color: Some(ToastColor::Danger),
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

            // Add Yaku run lifecycle registry
            app.manage(yaku_commands::YakuRunRegistry::default());

            // Specific settings
            let settings = load_yaku_app_settings(app.app_handle());
            app.app_handle().set_native_titlebar(settings.use_native_titlebar);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_commands::cmd_check_for_updates,
            notifications::cmd_dismiss_notification,
            formatting::cmd_format_json,
            formatting::cmd_format_graphql,
            formatting::cmd_format_xml,
            formatting::cmd_format_html,
            metadata_commands::cmd_metadata,
            window_commands::cmd_new_child_window,
            window_commands::cmd_restart,
            //
            // Yaku commands
            yaku_commands::cmd_yaku_workspace_list,
            yaku_commands::cmd_yaku_workspace_get,
            yaku_commands::cmd_yaku_workspace_create,
            yaku_commands::cmd_yaku_workspace_delete,
            yaku_commands::cmd_yaku_environment_list,
            yaku_commands::cmd_yaku_environment_get,
            yaku_commands::cmd_yaku_environment_create,
            yaku_commands::cmd_yaku_environment_update,
            yaku_commands::cmd_yaku_environment_delete,
            yaku_commands::cmd_yaku_request_list,
            yaku_commands::cmd_yaku_request_get,
            yaku_commands::cmd_yaku_request_node_get,
            yaku_commands::cmd_yaku_folder_create,
            yaku_commands::cmd_yaku_folder_update,
            yaku_commands::cmd_yaku_request_create,
            yaku_commands::cmd_yaku_request_update,
            yaku_commands::cmd_yaku_request_node_move,
            yaku_commands::cmd_yaku_request_node_delete,
            yaku_commands::cmd_yaku_run_list,
            yaku_commands::cmd_yaku_run_get,
            yaku_commands::cmd_yaku_run_events,
            yaku_commands::cmd_yaku_run_bodies,
            yaku_commands::cmd_yaku_run_body_bytes,
            yaku_commands::cmd_yaku_run_start,
            yaku_commands::cmd_yaku_run_cancel,
            yaku_commands::cmd_yaku_run_delete,
            yaku_commands::cmd_yaku_run_prune,
            yaku_commands::cmd_yaku_run_retention_get,
            yaku_commands::cmd_yaku_run_retention_set,
            yaku_commands::cmd_yaku_run_retention_clear,
            yaku_commands::cmd_yaku_setting_get,
            yaku_commands::cmd_yaku_setting_set,
            yaku_commands::cmd_yaku_backup_export,
            yaku_commands::cmd_yaku_backup_import,
            yaku_commands::cmd_yaku_gc_bodies,
            yaku_commands::cmd_yaku_send_request,
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

                    match yaku_commands::cancel_running_runs_on_startup(app_handle) {
                        Ok(0) => {}
                        Ok(count) => info!("Cancelled {count} stale Yaku runs on startup"),
                        Err(err) => warn!("Failed to cancel stale Yaku runs on startup: {err}"),
                    }
                }
                RunEvent::WindowEvent { event: WindowEvent::Focused(true), label, .. } => {
                    if cfg!(feature = "updater") {
                        // Run update check whenever the window is focused
                        let w = app_handle.get_webview_window(&label).unwrap();
                        let h = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            let settings = load_yaku_app_settings(&w);
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
