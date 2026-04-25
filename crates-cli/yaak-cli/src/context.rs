use std::path::{Path, PathBuf};
use std::sync::Arc;
use yaak_crypto::manager::EncryptionManager;
use yaak_models::blob_manager::BlobManager;
use yaak_models::db_context::DbContext;
use yaak_models::query_manager::QueryManager;

#[derive(Clone, Debug, Default)]
pub struct CliExecutionContext {
    pub request_id: Option<String>,
    pub workspace_id: Option<String>,
    pub environment_id: Option<String>,
    pub cookie_jar_id: Option<String>,
}

pub struct CliContext {
    data_dir: PathBuf,
    query_manager: QueryManager,
    blob_manager: BlobManager,
    pub encryption_manager: Arc<EncryptionManager>,
}

impl CliContext {
    pub fn new(data_dir: PathBuf, app_id: &str) -> Self {
        let db_path = data_dir.join("db.sqlite");
        let blob_path = data_dir.join("blobs.sqlite");
        let (query_manager, blob_manager, _rx) =
            match yaak_models::init_standalone(&db_path, &blob_path) {
                Ok(v) => v,
                Err(err) => {
                    eprintln!("Error: Failed to initialize database: {err}");
                    std::process::exit(1);
                }
            };
        let encryption_manager = Arc::new(EncryptionManager::new(query_manager.clone(), app_id));

        Self { data_dir, query_manager, blob_manager, encryption_manager }
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn db(&self) -> DbContext<'_> {
        self.query_manager.connect()
    }

    pub fn query_manager(&self) -> &QueryManager {
        &self.query_manager
    }

    pub fn blob_manager(&self) -> &BlobManager {
        &self.blob_manager
    }

    pub async fn shutdown(&self) {
        // No plugin manager to shutdown anymore
    }
}
