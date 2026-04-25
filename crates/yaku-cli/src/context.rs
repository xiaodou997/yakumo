use std::path::{Path, PathBuf};
use std::sync::Arc;
use yakumo_crypto::manager::EncryptionManager;
use yakumo_models::blob_manager::BlobManager;
use yakumo_models::db_context::DbContext;
use yakumo_models::query_manager::QueryManager;

pub struct CliContext {
    data_dir: PathBuf,
    query_manager: QueryManager,
    blob_manager: BlobManager,
    _encryption_manager: Arc<EncryptionManager>,
}

impl CliContext {
    pub fn new(data_dir: PathBuf, app_id: &str) -> Self {
        let db_path = data_dir.join("db.sqlite");
        let blob_path = data_dir.join("blobs.sqlite");
        let (query_manager, blob_manager, _rx) =
            match yakumo_models::init_standalone(&db_path, &blob_path) {
                Ok(v) => v,
                Err(err) => {
                    eprintln!("Error: Failed to initialize database: {err}");
                    std::process::exit(1);
                }
            };
        let encryption_manager = Arc::new(EncryptionManager::new(query_manager.clone(), app_id));

        Self { data_dir, query_manager, blob_manager, _encryption_manager: encryption_manager }
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn db(&self) -> DbContext<'_> {
        self.query_manager.connect()
    }

    pub fn blob_manager(&self) -> &BlobManager {
        &self.blob_manager
    }

    pub async fn shutdown(&self) {
        // No plugin manager to shutdown anymore
    }
}
