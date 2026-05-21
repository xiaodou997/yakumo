use crate::error::Error::GenericError;
use crate::error::Result;
use std::path::Path;

pub(crate) fn existing_file(path: &Path, label: &str) -> Result<()> {
    if !path.is_file() {
        return Err(GenericError(format!("{label} must be an existing file")));
    }
    Ok(())
}

pub(crate) fn existing_dir(path: &Path, label: &str) -> Result<()> {
    if !path.is_dir() {
        return Err(GenericError(format!("{label} must be an existing directory")));
    }
    Ok(())
}

pub(crate) fn writable_parent(path: &Path, label: &str) -> Result<()> {
    let parent =
        path.parent().ok_or_else(|| GenericError(format!("{label} must include a parent path")))?;
    existing_dir(parent, &format!("{label} parent"))
}
