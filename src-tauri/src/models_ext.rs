//! Temporary access to the legacy yakumo-models database.
//!
//! Yaku is the active data model. This module only keeps the old QueryManager
//! available for startup/update/notification code that has not moved yet.

use tauri::plugin::TauriPlugin;
use tauri::{Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use yakumo_models::db_context::DbContext;
use yakumo_models::error::Result;
use yakumo_models::query_manager::QueryManager;

pub trait QueryManagerExt<'a, R> {
    fn db(&'a self) -> DbContext<'a>;
    fn with_tx<F, T>(&'a self, func: F) -> Result<T>
    where
        F: FnOnce(&DbContext) -> Result<T>;
}

impl<'a, R: Runtime, M: Manager<R>> QueryManagerExt<'a, R> for M {
    fn db(&'a self) -> DbContext<'a> {
        let qm = self.state::<QueryManager>();
        qm.inner().connect()
    }

    fn with_tx<F, T>(&'a self, func: F) -> Result<T>
    where
        F: FnOnce(&DbContext) -> Result<T>,
    {
        let qm = self.state::<QueryManager>();
        qm.inner().with_tx(func)
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("yakumo-models-db")
        .setup(|app_handle, _api| {
            let app_path = app_handle.path().app_data_dir().unwrap();
            let db_path = app_path.join("db.sqlite");
            let blob_path = app_path.join("blobs.sqlite");

            let (query_manager, _blob_manager, _rx) =
                match yakumo_models::init_standalone(&db_path, &blob_path) {
                    Ok(result) => result,
                    Err(e) => {
                        app_handle
                            .dialog()
                            .message(e.to_string())
                            .kind(MessageDialogKind::Error)
                            .blocking_show();
                        return Err(Box::from(e.to_string()));
                    }
                };

            app_handle.manage(query_manager);
            Ok(())
        })
        .build()
}
