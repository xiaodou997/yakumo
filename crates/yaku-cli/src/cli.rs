use clap::{Args, Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "yaku")]
#[command(about = "Yaku CLI - Yakumo API 命令行工具")]
#[command(version = crate::version::cli_version())]
#[command(disable_help_subcommand = true)]
#[command(after_help = r#"Agent Hints:
  - Template variable syntax is ${[ my_var ]}, not {{ ... }}
  - Template function syntax is ${[ namespace.my_func(a='aaa',b='bbb') ]}
  - View JSONSchema for models before creating or updating (eg. `yaku request schema http`)
  - The default CLI path is Yaku-native; `v2` remains as a temporary compatibility alias
  - Deletion requires confirmation (--yes for non-interactive environments)
  "#)]
pub struct Cli {
    /// Use a custom data directory
    #[arg(long, global = true)]
    pub data_dir: Option<PathBuf>,

    /// Environment ID to use for variable substitution
    #[arg(long, short, global = true)]
    pub environment: Option<String>,

    /// Cookie jar ID to use when sending requests
    #[arg(long = "cookie-jar", global = true, value_name = "COOKIE_JAR_ID")]
    pub cookie_jar: Option<String>,

    /// Enable verbose send output (events and streamed response body)
    #[arg(long, short, global = true)]
    pub verbose: bool,

    /// Enable CLI logging; optionally set level (error|warn|info|debug|trace)
    #[arg(long, global = true, value_name = "LEVEL", num_args = 0..=1, ignore_case = true)]
    pub log: Option<Option<LogLevel>>,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Send a request by ID
    Send(SendArgs),

    /// Cookie jar commands
    CookieJar(CookieJarArgs),

    /// Workspace commands
    Workspace(WorkspaceArgs),

    /// Request commands
    Request(RequestArgs),

    /// Folder commands
    Folder(FolderArgs),

    /// Environment commands
    Environment(EnvironmentArgs),

    /// Temporary compatibility alias for Yaku-native commands
    V2(V2Args),
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2Args {
    #[command(subcommand)]
    pub command: V2Commands,
}

#[derive(Subcommand)]
pub enum V2Commands {
    /// V2 workspace commands
    Workspace(V2WorkspaceArgs),

    /// V2 environment commands
    Environment(V2EnvironmentArgs),

    /// V2 request commands
    Request(V2RequestArgs),

    /// V2 run history commands
    Run(V2RunArgs),

    /// V2 backup commands
    Backup(V2BackupArgs),

    /// Send a V2 request by ID
    Send {
        /// Request ID
        request_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2BackupArgs {
    #[command(subcommand)]
    pub command: V2BackupCommands,
}

#[derive(Subcommand)]
pub enum V2BackupCommands {
    /// Export one workspace as stable JSON
    ExportWorkspace {
        /// Workspace ID
        workspace_id: String,

        /// Write JSON to a file instead of stdout
        #[arg(short, long)]
        output: Option<PathBuf>,
    },

    /// Import one workspace backup JSON file
    ImportWorkspace {
        /// Backup JSON file
        file: PathBuf,

        /// Replace an existing workspace with the same ID
        #[arg(long)]
        replace_existing: bool,
    },

    /// Verify one workspace backup JSON file
    VerifyWorkspace {
        /// Backup JSON file
        file: PathBuf,
    },

    /// List recorded backup manifests
    ListManifests {
        /// Filter by workspace ID
        #[arg(long)]
        workspace_id: Option<String>,

        /// Filter by content hash
        #[arg(long)]
        content_hash: Option<String>,

        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of manifests to return
        #[arg(long, default_value_t = 100)]
        limit: u32,
    },

    /// Get one backup manifest by ID
    GetManifest {
        /// Backup manifest ID
        manifest_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2EnvironmentArgs {
    #[command(subcommand)]
    pub command: V2EnvironmentCommands,
}

#[derive(Subcommand)]
pub enum V2EnvironmentCommands {
    /// List V2 environments in a workspace
    List {
        /// Workspace ID
        workspace_id: String,
    },

    /// Get a V2 environment by ID
    Get {
        /// Environment ID
        environment_id: String,
    },

    /// Create a V2 environment
    Create {
        /// Workspace ID
        workspace_id: String,

        /// Environment name
        #[arg(short, long)]
        name: String,

        /// Variables as a JSON object
        #[arg(long, default_value = "{}")]
        variables_json: String,
    },

    /// Update a V2 environment
    Update {
        /// Environment ID
        environment_id: String,

        /// New environment name
        #[arg(short, long)]
        name: Option<String>,

        /// Replace variables with a JSON object
        #[arg(long)]
        variables_json: Option<String>,
    },

    /// Delete a V2 environment
    Delete {
        /// Environment ID
        environment_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2WorkspaceArgs {
    #[command(subcommand)]
    pub command: V2WorkspaceCommands,
}

#[derive(Subcommand)]
pub enum V2WorkspaceCommands {
    /// List V2 workspaces
    List {
        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of workspaces to return
        #[arg(long, default_value_t = 500)]
        limit: u32,
    },

    /// Create a V2 workspace
    Create {
        /// Workspace name
        #[arg(short, long)]
        name: String,

        /// Workspace description
        #[arg(short, long, default_value = "")]
        description: String,
    },

    /// Get a V2 workspace by ID
    Get {
        /// Workspace ID
        workspace_id: String,
    },

    /// Delete a V2 workspace
    Delete {
        /// Workspace ID
        workspace_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2RequestArgs {
    #[command(subcommand)]
    pub command: V2RequestCommands,
}

#[derive(Subcommand)]
pub enum V2RequestCommands {
    /// List V2 request tree nodes in a workspace
    List {
        /// Workspace ID
        workspace_id: String,

        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of request tree nodes to return
        #[arg(long, default_value_t = 500)]
        limit: u32,
    },

    /// Get a V2 request by ID
    Get {
        /// Request ID
        request_id: String,
    },

    /// Get a V2 request tree node by node ID
    GetNode {
        /// Request tree node ID
        node_id: String,
    },

    /// Duplicate a V2 request
    Duplicate {
        /// Source request ID
        request_id: String,

        /// Duplicate request name
        #[arg(short, long)]
        name: Option<String>,

        /// Parent folder node ID. Omit to place at workspace root.
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Create a V2 HTTP request
    Create {
        /// Workspace ID
        workspace_id: String,

        /// Request name
        #[arg(short, long)]
        name: String,

        /// HTTP method
        #[arg(short, long, default_value = "GET")]
        method: String,

        /// URL
        #[arg(short, long)]
        url: String,

        /// HTTP header as NAME=VALUE. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Query parameter as NAME=VALUE. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Raw request body text
        #[arg(long)]
        body: Option<String>,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Patch a V2 HTTP request config
    PatchHttp {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// HTTP method
        #[arg(short, long)]
        method: Option<String>,

        /// URL
        #[arg(short, long)]
        url: Option<String>,

        /// Replace HTTP headers with NAME=VALUE entries. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Replace query parameters with NAME=VALUE entries. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Replace raw request body text
        #[arg(long)]
        body: Option<String>,

        /// Remove request body
        #[arg(long, conflicts_with = "body")]
        clear_body: bool,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Enable following HTTP redirects
        #[arg(long, conflicts_with = "no_follow_redirects")]
        follow_redirects: bool,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,
    },

    /// Patch a V2 GraphQL request config
    PatchGraphql {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// GraphQL endpoint URL
        #[arg(short, long)]
        url: Option<String>,

        /// GraphQL query document
        #[arg(long)]
        query: Option<String>,

        /// GraphQL variables as a JSON object
        #[arg(long)]
        variables: Option<String>,

        /// Clear GraphQL variables to an empty object
        #[arg(long, conflicts_with = "variables")]
        clear_variables: bool,

        /// GraphQL operation name
        #[arg(long)]
        operation_name: Option<String>,

        /// Clear GraphQL operation name
        #[arg(long, conflicts_with = "operation_name")]
        clear_operation_name: bool,

        /// Replace HTTP headers with NAME=VALUE entries. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Enable following HTTP redirects
        #[arg(long, conflicts_with = "no_follow_redirects")]
        follow_redirects: bool,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,
    },

    /// Patch a V2 SSE request config
    PatchSse {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// SSE endpoint URL
        #[arg(short, long)]
        url: Option<String>,

        /// Replace HTTP headers with NAME=VALUE entries. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Replace query parameters with NAME=VALUE entries. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Enable following HTTP redirects
        #[arg(long, conflicts_with = "no_follow_redirects")]
        follow_redirects: bool,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,
    },

    /// Create a V2 folder in the request tree
    CreateFolder {
        /// Workspace ID
        workspace_id: String,

        /// Folder name
        #[arg(short, long)]
        name: String,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Update V2 request metadata or config
    Update {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// New request description
        #[arg(short, long)]
        description: Option<String>,

        /// Replace request config with a JSON object
        #[arg(long)]
        config_json: Option<String>,
    },

    /// Move a V2 request tree node
    Move {
        /// Request tree node ID
        node_id: String,

        /// New parent folder node ID. Omit to move to workspace root.
        #[arg(long)]
        parent_id: Option<String>,

        /// New stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Delete a V2 request tree node
    Delete {
        /// Request tree node ID
        node_id: String,
    },

    /// Create a V2 GraphQL request
    CreateGraphql {
        /// Workspace ID
        workspace_id: String,

        /// Request name
        #[arg(short, long)]
        name: String,

        /// GraphQL endpoint URL
        #[arg(short, long)]
        url: String,

        /// GraphQL query document
        #[arg(long)]
        query: String,

        /// GraphQL variables as a JSON object
        #[arg(long)]
        variables: Option<String>,

        /// GraphQL operation name
        #[arg(long)]
        operation_name: Option<String>,

        /// HTTP header as NAME=VALUE. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Create a V2 SSE request
    CreateSse {
        /// Workspace ID
        workspace_id: String,

        /// Request name
        #[arg(short, long)]
        name: String,

        /// SSE endpoint URL
        #[arg(short, long)]
        url: String,

        /// HTTP header as NAME=VALUE. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Query parameter as NAME=VALUE. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,

        /// Disable following HTTP redirects
        #[arg(long)]
        no_follow_redirects: bool,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Create a V2 WebSocket request
    CreateWebsocket {
        /// Workspace ID
        workspace_id: String,

        /// Request name
        #[arg(short, long)]
        name: String,

        /// WebSocket endpoint URL
        #[arg(short, long)]
        url: String,

        /// HTTP header as NAME=VALUE. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Query parameter as NAME=VALUE. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Text message to send after connect. Can be repeated.
        #[arg(long = "message")]
        messages: Vec<String>,

        /// Maximum number of incoming messages to read before completing
        #[arg(long, default_value_t = 16)]
        max_messages: u32,

        /// Read timeout in milliseconds
        #[arg(long, default_value_t = 30_000)]
        timeout_ms: u64,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Patch a V2 WebSocket request config
    PatchWebsocket {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// WebSocket endpoint URL
        #[arg(short, long)]
        url: Option<String>,

        /// Replace HTTP headers with NAME=VALUE entries. Can be repeated.
        #[arg(long = "header", value_name = "NAME=VALUE")]
        headers: Vec<String>,

        /// Replace query parameters with NAME=VALUE entries. Can be repeated.
        #[arg(long = "query", value_name = "NAME=VALUE")]
        query: Vec<String>,

        /// Replace text messages to send after connect. Can be repeated.
        #[arg(long = "message")]
        messages: Vec<String>,

        /// Clear startup messages
        #[arg(long, conflicts_with = "messages")]
        clear_messages: bool,

        /// Maximum number of incoming messages to read before completing
        #[arg(long)]
        max_messages: Option<u32>,

        /// Read timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,
    },

    /// Create a V2 gRPC request
    CreateGrpc {
        /// Workspace ID
        workspace_id: String,

        /// Request name
        #[arg(short, long)]
        name: String,

        /// gRPC server URL, for example http://127.0.0.1:50051
        #[arg(short, long)]
        url: String,

        /// Fully-qualified gRPC service name
        #[arg(long)]
        service: String,

        /// gRPC method name
        #[arg(long)]
        method: String,

        /// Request metadata as NAME=VALUE. Can be repeated.
        #[arg(long = "metadata", value_name = "NAME=VALUE")]
        metadata: Vec<String>,

        /// Request JSON message
        #[arg(long)]
        message: Option<String>,

        /// Local proto file path. Can be repeated.
        #[arg(long = "proto-file")]
        proto_files: Vec<String>,

        /// Disable server reflection
        #[arg(long)]
        no_reflection: bool,

        /// Request timeout in milliseconds
        #[arg(long, default_value_t = 30_000)]
        timeout_ms: u64,

        /// Parent folder node ID
        #[arg(long)]
        parent_id: Option<String>,

        /// Stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Patch a V2 gRPC request config
    PatchGrpc {
        /// Request ID
        request_id: String,

        /// New request name
        #[arg(short, long)]
        name: Option<String>,

        /// gRPC server URL, for example http://127.0.0.1:50051
        #[arg(short, long)]
        url: Option<String>,

        /// Fully-qualified gRPC service name
        #[arg(long)]
        service: Option<String>,

        /// gRPC method name
        #[arg(long)]
        method: Option<String>,

        /// Replace request metadata as NAME=VALUE. Can be repeated.
        #[arg(long = "metadata", value_name = "NAME=VALUE")]
        metadata: Vec<String>,

        /// Replace request JSON message
        #[arg(long)]
        message: Option<String>,

        /// Clear request message
        #[arg(long, conflicts_with = "message")]
        clear_message: bool,

        /// Replace local proto file paths. Can be repeated.
        #[arg(long = "proto-file")]
        proto_files: Vec<String>,

        /// Clear local proto file paths
        #[arg(long, conflicts_with = "proto_files")]
        clear_proto_files: bool,

        /// Enable server reflection
        #[arg(long, conflicts_with = "no_reflection")]
        reflection: bool,

        /// Disable server reflection
        #[arg(long)]
        no_reflection: bool,

        /// Request timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct V2RunArgs {
    #[command(subcommand)]
    pub command: V2RunCommands,
}

#[derive(Subcommand)]
pub enum V2RunCommands {
    /// Get one run by ID
    Get {
        /// Run ID
        run_id: String,
    },

    /// List runs for a request
    List {
        /// Request ID
        request_id: String,

        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of runs to return
        #[arg(long, default_value_t = 50)]
        limit: u32,
    },

    /// List runs for a workspace
    ListWorkspace {
        /// Workspace ID
        workspace_id: String,

        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of runs to return
        #[arg(long, default_value_t = 50)]
        limit: u32,
    },

    /// List events for a run
    Events {
        /// Run ID
        run_id: String,

        /// Event ID cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Filter by event kind, for example request_snapshot, message, or error
        #[arg(long)]
        kind: Option<String>,

        /// Maximum number of events to return
        #[arg(long, default_value_t = 200)]
        limit: u32,
    },

    /// Get the effective request snapshot for a run
    Snapshot {
        /// Run ID
        run_id: String,
    },

    /// List stored body records for a run
    Bodies {
        /// Run ID
        run_id: String,
    },

    /// Print one stored body by body ID
    Body {
        /// Body ID
        body_id: String,
    },

    /// Delete one run and its events/body metadata
    Delete {
        /// Run ID
        run_id: String,
    },

    /// Prune old runs while keeping the newest N
    Prune {
        /// Request ID to prune
        #[arg(
            long,
            conflicts_with = "workspace_id",
            required_unless_present = "workspace_id"
        )]
        request_id: Option<String>,

        /// Workspace ID to prune
        #[arg(
            long,
            conflicts_with = "request_id",
            required_unless_present = "request_id"
        )]
        workspace_id: Option<String>,

        /// Number of newest runs to keep
        #[arg(long, default_value_t = 50)]
        keep_last: u32,
    },

    /// Show workspace run retention policy
    RetentionGet {
        /// Workspace ID
        workspace_id: String,
    },

    /// Set workspace run retention policy
    RetentionSet {
        /// Workspace ID
        workspace_id: String,

        /// Number of newest workspace runs to keep after each send
        #[arg(long)]
        keep_last: u32,
    },

    /// Clear workspace run retention policy
    RetentionClear {
        /// Workspace ID
        workspace_id: String,
    },

    /// Delete unreferenced response body files
    GcBodies {
        /// Only report what would be deleted
        #[arg(long)]
        dry_run: bool,
    },
}

#[derive(Args)]
pub struct SendArgs {
    /// Request ID
    pub id: String,

    /// Execute requests in parallel
    #[arg(long)]
    pub parallel: bool,

    /// Stop on first request failure when sending folders/workspaces
    #[arg(long, conflicts_with = "parallel")]
    pub fail_fast: bool,
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct CookieJarArgs {
    #[command(subcommand)]
    pub command: CookieJarCommands,
}

#[derive(Subcommand)]
pub enum CookieJarCommands {
    /// List cookie jars in a workspace
    List {
        /// Workspace ID (optional when exactly one workspace exists)
        workspace_id: Option<String>,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct WorkspaceArgs {
    #[command(subcommand)]
    pub command: WorkspaceCommands,
}

#[derive(Subcommand)]
pub enum WorkspaceCommands {
    /// List all workspaces
    List,

    /// Output JSON schema for workspace create/update payloads
    Schema {
        /// Pretty-print schema JSON output
        #[arg(long)]
        pretty: bool,
    },

    /// Show a workspace as JSON
    Show {
        /// Workspace ID
        workspace_id: String,
    },

    /// Create a workspace
    Create {
        /// Workspace name
        #[arg(short, long)]
        name: Option<String>,

        /// JSON payload
        #[arg(long, conflicts_with = "json_input")]
        json: Option<String>,

        /// JSON payload shorthand
        #[arg(value_name = "JSON", conflicts_with = "json")]
        json_input: Option<String>,
    },

    /// Update a workspace
    Update {
        /// JSON payload
        #[arg(long, conflicts_with = "json_input")]
        json: Option<String>,

        /// JSON payload shorthand
        #[arg(value_name = "JSON", conflicts_with = "json")]
        json_input: Option<String>,
    },

    /// Delete a workspace
    Delete {
        /// Workspace ID
        workspace_id: String,

        /// Skip confirmation prompt
        #[arg(short, long)]
        yes: bool,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct RequestArgs {
    #[command(subcommand)]
    pub command: RequestCommands,
}

#[derive(Subcommand)]
pub enum RequestCommands {
    /// List requests in a workspace
    List {
        /// Workspace ID (optional when exactly one workspace exists)
        workspace_id: Option<String>,
    },

    /// Show a request as JSON
    Show {
        /// Request ID
        request_id: String,
    },

    /// Send a request by ID
    Send {
        /// Request ID
        request_id: String,
    },

    /// Output JSON schema for request create/update payloads
    Schema {
        #[arg(value_enum)]
        request_type: RequestSchemaType,

        /// Pretty-print schema JSON output
        #[arg(long)]
        pretty: bool,
    },

    /// Create a new HTTP request
    Create {
        /// Workspace ID (or positional JSON payload shorthand)
        workspace_id: Option<String>,

        /// Request name
        #[arg(short, long)]
        name: Option<String>,

        /// HTTP method
        #[arg(short, long)]
        method: Option<String>,

        /// URL
        #[arg(short, long)]
        url: Option<String>,

        /// JSON payload
        #[arg(long)]
        json: Option<String>,
    },

    /// Update an HTTP request
    Update {
        /// JSON payload
        #[arg(long, conflicts_with = "json_input")]
        json: Option<String>,

        /// JSON payload shorthand
        #[arg(value_name = "JSON", conflicts_with = "json")]
        json_input: Option<String>,
    },

    /// Delete a request
    Delete {
        /// Request tree node ID
        request_id: String,

        /// Skip confirmation prompt
        #[arg(short, long)]
        yes: bool,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum RequestSchemaType {
    Http,
    Grpc,
    Websocket,
}

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl LogLevel {
    pub fn as_filter(self) -> log::LevelFilter {
        match self {
            LogLevel::Error => log::LevelFilter::Error,
            LogLevel::Warn => log::LevelFilter::Warn,
            LogLevel::Info => log::LevelFilter::Info,
            LogLevel::Debug => log::LevelFilter::Debug,
            LogLevel::Trace => log::LevelFilter::Trace,
        }
    }
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct FolderArgs {
    #[command(subcommand)]
    pub command: FolderCommands,
}

#[derive(Subcommand)]
pub enum FolderCommands {
    /// List folders in a workspace
    List {
        /// Workspace ID (optional when exactly one workspace exists)
        workspace_id: Option<String>,
    },

    /// Output JSON schema for folder create/update payloads
    Schema {
        /// Pretty-print schema JSON output
        #[arg(long)]
        pretty: bool,
    },

    /// Show a folder as JSON
    Show {
        /// Folder ID
        folder_id: String,
    },

    /// Create a folder
    Create {
        /// Workspace ID (or positional JSON payload shorthand)
        workspace_id: Option<String>,

        /// Folder name
        #[arg(short, long)]
        name: Option<String>,

        /// JSON payload
        #[arg(long)]
        json: Option<String>,
    },

    /// Update a folder
    Update {
        /// JSON payload
        #[arg(long, conflicts_with = "json_input")]
        json: Option<String>,

        /// JSON payload shorthand
        #[arg(value_name = "JSON", conflicts_with = "json")]
        json_input: Option<String>,
    },

    /// Delete a folder
    Delete {
        /// Folder ID
        folder_id: String,

        /// Skip confirmation prompt
        #[arg(short, long)]
        yes: bool,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct EnvironmentArgs {
    #[command(subcommand)]
    pub command: EnvironmentCommands,
}

#[derive(Subcommand)]
pub enum EnvironmentCommands {
    /// List environments in a workspace
    List {
        /// Workspace ID (optional when exactly one workspace exists)
        workspace_id: Option<String>,
    },

    /// Output JSON schema for environment create/update payloads
    Schema {
        /// Pretty-print schema JSON output
        #[arg(long)]
        pretty: bool,
    },

    /// Show an environment as JSON
    Show {
        /// Environment ID
        environment_id: String,
    },

    /// Create an environment
    #[command(after_help = r#"Modes (choose one):
  1) yaku environment create <workspace_id> --name <name>
  2) yaku environment create --json '{"workspaceId":"wk_abc","name":"Production"}'
  3) yaku environment create '{"workspaceId":"wk_abc","name":"Production"}'
  4) yaku environment create <workspace_id> --json '{"name":"Production"}'
"#)]
    Create {
        /// Workspace ID for flag-based mode, or positional JSON payload shorthand
        #[arg(value_name = "WORKSPACE_ID_OR_JSON")]
        workspace_id: Option<String>,

        /// Environment name
        #[arg(short, long)]
        name: Option<String>,

        /// JSON payload (use instead of WORKSPACE_ID/--name)
        #[arg(long)]
        json: Option<String>,
    },

    /// Update an environment
    Update {
        /// JSON payload
        #[arg(long, conflicts_with = "json_input")]
        json: Option<String>,

        /// JSON payload shorthand
        #[arg(value_name = "JSON", conflicts_with = "json")]
        json_input: Option<String>,
    },

    /// Delete an environment
    Delete {
        /// Environment ID
        environment_id: String,

        /// Skip confirmation prompt
        #[arg(short, long)]
        yes: bool,
    },
}
