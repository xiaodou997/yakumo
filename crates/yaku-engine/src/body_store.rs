use crate::error::{Error, Result};
use std::path::{Path, PathBuf};
use yaku_domain::BodyStorageKind;

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct StoredBody {
    pub storage_kind: BodyStorageKind,
    pub storage_ref: String,
}

pub trait BodyStore {
    fn store(&self, body: &[u8]) -> Result<StoredBody>;
}

#[derive(Debug, Clone, Default)]
pub struct InlineBodyStore;

impl BodyStore for InlineBodyStore {
    fn store(&self, body: &[u8]) -> Result<StoredBody> {
        Ok(StoredBody {
            storage_kind: BodyStorageKind::Inline,
            storage_ref: inline_storage_ref(body),
        })
    }
}

#[derive(Debug, Clone)]
pub struct FileBodyStore {
    dir: PathBuf,
}

impl FileBodyStore {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }

    fn body_path(&self, body: &[u8]) -> PathBuf {
        let hash = stable_body_hash(body);
        self.dir.join(format!("{hash}.body"))
    }
}

impl BodyStore for FileBodyStore {
    fn store(&self, body: &[u8]) -> Result<StoredBody> {
        std::fs::create_dir_all(&self.dir).map_err(|err| Error::BodyStore(err.to_string()))?;
        let path = self.body_path(body);
        std::fs::write(&path, body).map_err(|err| Error::BodyStore(err.to_string()))?;
        Ok(StoredBody { storage_kind: BodyStorageKind::File, storage_ref: file_storage_ref(&path) })
    }
}

#[derive(Debug, Clone)]
pub struct ThresholdBodyStore {
    inline: InlineBodyStore,
    file: FileBodyStore,
    inline_limit_bytes: usize,
}

impl ThresholdBodyStore {
    pub fn new(dir: impl Into<PathBuf>, inline_limit_bytes: usize) -> Self {
        Self { inline: InlineBodyStore, file: FileBodyStore::new(dir), inline_limit_bytes }
    }
}

impl BodyStore for ThresholdBodyStore {
    fn store(&self, body: &[u8]) -> Result<StoredBody> {
        if body.len() <= self.inline_limit_bytes {
            self.inline.store(body)
        } else {
            self.file.store(body)
        }
    }
}

fn inline_storage_ref(body: &[u8]) -> String {
    match std::str::from_utf8(body) {
        Ok(text) => format!("inline:{text}"),
        Err(_) => format!(
            "inline:hex:{}",
            body.iter().map(|byte| format!("{byte:02x}")).collect::<String>()
        ),
    }
}

fn file_storage_ref(path: &Path) -> String {
    format!("file:{}", path.to_string_lossy())
}

fn stable_body_hash(body: &[u8]) -> String {
    let mut hash = 0xcbf2_9ce4_8422_2325u64;
    for byte in body {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stores_utf8_inline() {
        let stored = InlineBodyStore.store(b"{\"ok\":true}").expect("stored");
        assert_eq!(stored.storage_kind, BodyStorageKind::Inline);
        assert_eq!(stored.storage_ref, "inline:{\"ok\":true}");
    }

    #[test]
    fn stores_binary_inline_hex() {
        let stored = InlineBodyStore.store(&[0, 255, 16]).expect("stored");
        assert_eq!(stored.storage_kind, BodyStorageKind::Inline);
        assert_eq!(stored.storage_ref, "inline:hex:00ff10");
    }

    #[test]
    fn threshold_store_keeps_small_body_inline() {
        let dir = std::env::temp_dir().join(format!("yakumo-body-test-{}", std::process::id()));
        let store = ThresholdBodyStore::new(&dir, 16);
        let stored = store.store(b"small").expect("stored");
        assert_eq!(stored.storage_kind, BodyStorageKind::Inline);
        assert_eq!(stored.storage_ref, "inline:small");
    }

    #[test]
    fn threshold_store_writes_large_body_to_file() {
        let dir =
            std::env::temp_dir().join(format!("yakumo-body-test-{}-large", std::process::id()));
        let store = ThresholdBodyStore::new(&dir, 4);
        let stored = store.store(b"larger-than-limit").expect("stored");
        assert_eq!(stored.storage_kind, BodyStorageKind::File);
        assert!(stored.storage_ref.starts_with("file:"));
        let path = stored.storage_ref.strip_prefix("file:").expect("file ref");
        assert_eq!(std::fs::read(path).expect("body file"), b"larger-than-limit");
    }
}
