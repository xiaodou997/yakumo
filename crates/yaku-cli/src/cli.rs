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
  - The default CLI path is Yaku-native; legacy `v2` commands are no longer exposed
  "#)]
pub struct Cli {
    /// Use a custom data directory
    #[arg(long, global = true)]
    pub data_dir: Option<PathBuf>,

    /// Environment ID to use for variable substitution
    #[arg(long, short, global = true)]
    pub environment: Option<String>,

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

    /// Workspace commands
    Workspace(YakuWorkspaceArgs),

    /// Request commands
    Request(YakuRequestArgs),

    /// Folder commands
    Folder(YakuFolderArgs),

    /// Environment commands
    Environment(YakuEnvironmentArgs),

    /// Run history commands
    Run(YakuRunArgs),

    /// Backup commands
    Backup(YakuBackupArgs),
}

#[derive(Subcommand)]
pub enum YakuCommands {
    /// Yaku workspace commands
    Workspace(YakuWorkspaceArgs),

    /// Yaku environment commands
    Environment(YakuEnvironmentArgs),

    /// Yaku request commands
    Request(YakuRequestArgs),

    /// Yaku folder commands
    Folder(YakuFolderArgs),

    /// Yaku run history commands
    Run(YakuRunArgs),

    /// Yaku backup commands
    Backup(YakuBackupArgs),

    /// Send a Yaku request by ID
    Send {
        /// Request ID
        request_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct YakuBackupArgs {
    #[command(subcommand)]
    pub command: YakuBackupCommands,
}

#[derive(Subcommand)]
pub enum YakuBackupCommands {
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
pub struct YakuEnvironmentArgs {
    #[command(subcommand)]
    pub command: YakuEnvironmentCommands,
}

#[derive(Subcommand)]
pub enum YakuEnvironmentCommands {
    /// List Yaku environments in a workspace
    List {
        /// Workspace ID
        workspace_id: String,
    },

    /// Get a Yaku environment by ID
    Get {
        /// Environment ID
        environment_id: String,
    },

    /// Create a Yaku environment
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

    /// Update a Yaku environment
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

    /// Delete a Yaku environment
    Delete {
        /// Environment ID
        environment_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct YakuWorkspaceArgs {
    #[command(subcommand)]
    pub command: YakuWorkspaceCommands,
}

#[derive(Subcommand)]
pub enum YakuWorkspaceCommands {
    /// List Yaku workspaces
    List {
        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of workspaces to return
        #[arg(long, default_value_t = 500)]
        limit: u32,
    },

    /// Create a Yaku workspace
    Create {
        /// Workspace name
        #[arg(short, long)]
        name: String,

        /// Workspace description
        #[arg(short, long, default_value = "")]
        description: String,
    },

    /// Get a Yaku workspace by ID
    Get {
        /// Workspace ID
        workspace_id: String,
    },

    /// Delete a Yaku workspace
    Delete {
        /// Workspace ID
        workspace_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct YakuFolderArgs {
    #[command(subcommand)]
    pub command: YakuFolderCommands,
}

#[derive(Subcommand)]
pub enum YakuFolderCommands {
    /// List Yaku folders in a workspace
    List {
        /// Workspace ID
        workspace_id: String,

        /// Cursor returned by a previous page
        #[arg(long)]
        cursor: Option<i64>,

        /// Maximum number of request tree nodes to scan
        #[arg(long, default_value_t = 500)]
        limit: u32,
    },

    /// Get a Yaku folder by request tree node ID
    Get {
        /// Folder node ID
        folder_id: String,
    },

    /// Create a Yaku folder in the request tree
    Create {
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

    /// Rename a Yaku folder
    Update {
        /// Folder node ID
        folder_id: String,

        /// New folder name
        #[arg(short, long)]
        name: String,
    },

    /// Move a Yaku folder
    Move {
        /// Folder node ID
        folder_id: String,

        /// New parent folder node ID. Omit to move to workspace root.
        #[arg(long)]
        parent_id: Option<String>,

        /// New stable sort key
        #[arg(long)]
        sort_key: Option<String>,
    },

    /// Delete a Yaku folder and its subtree
    Delete {
        /// Folder node ID
        folder_id: String,
    },
}

#[derive(Args)]
#[command(disable_help_subcommand = true)]
pub struct YakuRequestArgs {
    #[command(subcommand)]
    pub command: YakuRequestCommands,
}

#[derive(Subcommand)]
pub enum YakuRequestCommands {
    /// List Yaku request tree nodes in a workspace
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

    /// Get a Yaku request by ID
    Get {
        /// Request ID
        request_id: String,
    },

    /// Get a Yaku request tree node by node ID
    GetNode {
        /// Request tree node ID
        node_id: String,
    },

    /// Duplicate a Yaku request
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

    /// Create a Yaku HTTP request
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

    /// Patch a Yaku HTTP request config
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

    /// Patch a Yaku GraphQL request config
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

    /// Patch a Yaku SSE request config
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

    /// Create a Yaku folder in the request tree
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

    /// Update Yaku request metadata or config
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

    /// Move a Yaku request tree node
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

    /// Delete a Yaku request tree node
    Delete {
        /// Request tree node ID
        node_id: String,
    },

    /// Create a Yaku GraphQL request
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

    /// Create a Yaku SSE request
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

    /// Create a Yaku WebSocket request
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

    /// Patch a Yaku WebSocket request config
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

    /// Create a Yaku gRPC request
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

    /// Patch a Yaku gRPC request config
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
pub struct YakuRunArgs {
    #[command(subcommand)]
    pub command: YakuRunCommands,
}

#[derive(Subcommand)]
pub enum YakuRunCommands {
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
