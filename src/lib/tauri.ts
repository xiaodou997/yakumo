import type { InvokeArgs } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";

type TauriCmd =
  | "cmd_check_for_updates"
  | "cmd_dismiss_notification"
  | "cmd_format_html"
  | "cmd_format_graphql"
  | "cmd_format_json"
  | "cmd_format_xml"
  | "cmd_metadata"
  | "cmd_restart"
  | "cmd_new_child_window"
  | "cmd_yaku_backup_export"
  | "cmd_yaku_backup_import"
  | "cmd_yaku_environment_create"
  | "cmd_yaku_environment_delete"
  | "cmd_yaku_environment_update"
  | "cmd_yaku_folder_create"
  | "cmd_yaku_folder_update"
  | "cmd_yaku_gc_bodies"
  | "cmd_yaku_request_create"
  | "cmd_yaku_request_node_delete"
  | "cmd_yaku_request_node_move"
  | "cmd_yaku_request_update"
  | "cmd_yaku_run_delete"
  | "cmd_yaku_run_prune"
  | "cmd_yaku_run_retention_clear"
  | "cmd_yaku_run_retention_get"
  | "cmd_yaku_run_retention_set"
  | "cmd_yaku_workspace_create"
  | "cmd_yaku_workspace_delete"
  | "cmd_yaku_environment_get"
  | "cmd_yaku_environment_list"
  | "cmd_yaku_request_get"
  | "cmd_yaku_request_list"
  | "cmd_yaku_request_node_get"
  | "cmd_yaku_run_bodies"
  | "cmd_yaku_run_body_bytes"
  | "cmd_yaku_run_cancel"
  | "cmd_yaku_run_events"
  | "cmd_yaku_run_get"
  | "cmd_yaku_run_list"
  | "cmd_yaku_run_start"
  | "cmd_yaku_send_request"
  | "cmd_yaku_setting_get"
  | "cmd_yaku_setting_set"
  | "cmd_yaku_workspace_get"
  | "cmd_yaku_workspace_list";

export async function invokeCmd<T>(cmd: TauriCmd, args?: InvokeArgs): Promise<T> {
  // console.log('RUN COMMAND', cmd, args);
  try {
    return await invoke(cmd, args);
  } catch (err) {
    console.warn("Tauri command error", cmd, err);
    throw err;
  }
}
