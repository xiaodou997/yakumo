pub fn cli_version() -> &'static str {
    option_env!("YAKU_CLI_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"))
}
