use crate::error::Error::GenericError;
use crate::error::Result;
use std::path::{Component, Path};

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

pub(crate) fn safe_relative_path(path: &Path, label: &str) -> Result<()> {
    if path.is_absolute() {
        return Err(GenericError(format!("{label} must be a relative path")));
    }

    if path.as_os_str().is_empty() {
        return Err(GenericError(format!("{label} must not be empty")));
    }

    let mut has_normal_component = false;
    let is_safe = path.components().all(|component| match component {
        Component::Normal(_) => {
            has_normal_component = true;
            true
        }
        Component::CurDir => true,
        _ => false,
    });
    if !is_safe {
        return Err(GenericError(format!("{label} must not escape the repository directory")));
    }
    if !has_normal_component {
        return Err(GenericError(format!("{label} must include a file path")));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::safe_relative_path;
    use std::path::Path;

    #[test]
    fn relative_normal_paths_are_allowed() {
        assert!(safe_relative_path(Path::new("requests/example.yaml"), "path").is_ok());
        assert!(safe_relative_path(Path::new("requests/./example.yaml"), "path").is_ok());
    }

    #[test]
    fn absolute_paths_are_rejected() {
        assert!(safe_relative_path(Path::new("/tmp/example.yaml"), "path").is_err());
    }

    #[test]
    fn parent_traversal_is_rejected() {
        assert!(safe_relative_path(Path::new("../example.yaml"), "path").is_err());
        assert!(safe_relative_path(Path::new("requests/../../example.yaml"), "path").is_err());
    }

    #[test]
    fn empty_or_current_directory_paths_are_rejected() {
        assert!(safe_relative_path(Path::new(""), "path").is_err());
        assert!(safe_relative_path(Path::new("."), "path").is_err());
        assert!(safe_relative_path(Path::new("./"), "path").is_err());
    }
}
