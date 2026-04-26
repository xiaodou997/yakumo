use crate::cli::{CookieJarArgs, CookieJarCommands};
use crate::context::CliContext;
use crate::utils::output::print_json;
use crate::utils::workspace::resolve_workspace_id;

type CommandResult<T = ()> = std::result::Result<T, String>;

pub fn run(ctx: &CliContext, args: CookieJarArgs) -> i32 {
    let result = match args.command {
        CookieJarCommands::List { workspace_id } => list(ctx, workspace_id.as_deref()),
    };

    match result {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("Error: {error}");
            1
        }
    }
}

fn list(ctx: &CliContext, workspace_id: Option<&str>) -> CommandResult {
    let workspace_id = resolve_workspace_id(ctx, workspace_id, "cookie-jar list")?;
    let cookie_jars = ctx
        .db()
        .list_cookie_jars(&workspace_id)
        .map_err(|e| format!("Failed to list cookie jars: {e}"))?;

    print_json(&cookie_jars, "cookie jar list output")
}
