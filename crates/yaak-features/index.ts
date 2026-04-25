// Types exported from generated bindings
export * from "./bindings/gen_models";
export * from "./bindings/gen_events";
export * from "./bindings/gen_search";
import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  WebsocketRequest,
  Workspace,
} from "./bindings/gen_models";

// Compatibility types for the built-in Yakumo feature layer. The plugin
// runtime is removed, but the app still uses these UI/action contracts.
export type JsonPrimitive = string | number | boolean | null;

export type Color = "primary" | "secondary" | "info" | "success" | "notice" | "warning" | "danger";
export type DialogSize = "sm" | "md" | "lg" | "full" | "dynamic";
export type EditorLanguage =
  | "css"
  | "graphql"
  | "html"
  | "javascript"
  | "json"
  | "markdown"
  | "text"
  | "xml"
  | "yaml"
  | (string & {});

export type GenericCompletionOption = {
  type?: string;
  label: string;
  detail?: string;
  info?: string;
  boost?: number;
  apply?: string;
};

type FormInputBase = {
  label?: string | null;
  description?: string;
  placeholder?: string;
  optional?: boolean;
  required?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  helpUrl?: string | null;
};

export type FormInputText = FormInputBase & {
  type: "text";
  name: string;
  defaultValue?: string;
  multiLine?: boolean;
  multiline?: boolean;
  password?: boolean;
  secret?: boolean;
  completionOptions?: GenericCompletionOption[];
};

export type FormInputEditor = FormInputBase & {
  type: "editor";
  name: string;
  defaultValue?: string;
  language?: EditorLanguage | null;
  rows?: number;
  readOnly?: boolean;
  completionOptions?: GenericCompletionOption[];
};

export type FormInputSelect = FormInputBase & {
  type: "select";
  name: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
};

export type FormInputCheckbox = FormInputBase & {
  type: "checkbox";
  name: string;
  defaultValue?: boolean;
};

export type FormInputHttpRequest = FormInputBase & {
  type: "http_request";
  name: string;
  defaultValue?: string;
};

export type FormInputFile = FormInputBase & {
  type: "file";
  name: string;
  defaultValue?: string | null;
  directory?: boolean;
};

export type FormInputKeyValue = FormInputBase & {
  type: "key_value";
  name: string;
  defaultValue?: string;
};

export type FormInputContainer = FormInputBase & {
  type: "accordion" | "h_stack" | "banner";
  inputs?: FormInput[];
  color?: Color;
};

export type FormInputMarkdown = FormInputBase & {
  type: "markdown";
  content: string;
};

export type FormInput =
  | FormInputText
  | FormInputEditor
  | FormInputSelect
  | FormInputCheckbox
  | FormInputHttpRequest
  | FormInputFile
  | FormInputKeyValue
  | FormInputContainer
  | FormInputMarkdown;

export type TemplateFunctionPreviewType = "none" | "click" | "live" | "text" | "json";
export type TemplateFunctionArg = FormInput;
export type TemplateFunction = {
  name: string;
  description?: string;
  args: TemplateFunctionArg[];
  previewType?: TemplateFunctionPreviewType;
  aliases?: string[];
  previewArgs?: string[];
};

export type CallTemplateFunctionArgs = {
  values: Record<string, JsonPrimitive | undefined>;
};

export type GetTemplateFunctionSummaryResponse = {
  pluginRefId: string;
  functions: TemplateFunction[];
};

export type GetTemplateFunctionConfigResponse = {
  pluginRefId: string;
  function: TemplateFunction;
};

export type HttpAuthenticationConfig = {
  args: FormInput[];
  actions?: Array<{ label: string; icon?: string }>;
  pluginRefId?: string;
};

export type HttpAuthenticationSummary = {
  name: string;
  label: string;
  shortLabel?: string;
  description?: string;
};

export type GetHttpAuthenticationSummaryResponse = HttpAuthenticationSummary;
export type GetHttpAuthenticationConfigResponse = HttpAuthenticationConfig;

export type ActionDefinition = {
  label: string;
  icon?: any;
};

export type HttpRequestAction = ActionDefinition;
export type GrpcRequestAction = ActionDefinition;
export type WebsocketRequestAction = ActionDefinition;
export type WorkspaceAction = ActionDefinition;
export type FolderAction = ActionDefinition;

type ActionResponse<TAction extends ActionDefinition> = {
  pluginRefId: string;
  actions: TAction[];
};

type ActionRequest<TArgs extends Record<string, unknown>> = {
  pluginRefId: string;
  index: number;
  args: TArgs;
};

export type GetHttpRequestActionsResponse = ActionResponse<HttpRequestAction>;
export type GetGrpcRequestActionsResponse = ActionResponse<GrpcRequestAction>;
export type GetWebsocketRequestActionsResponse = ActionResponse<WebsocketRequestAction>;
export type GetWorkspaceActionsResponse = ActionResponse<WorkspaceAction>;
export type GetFolderActionsResponse = ActionResponse<FolderAction>;

export type CallHttpRequestActionRequest = ActionRequest<{ httpRequest: HttpRequest }>;
export type CallGrpcRequestActionRequest = ActionRequest<{
  grpcRequest: GrpcRequest;
  protoFiles?: string[];
}>;
export type CallWebsocketRequestActionRequest = ActionRequest<{
  websocketRequest: WebsocketRequest;
}>;
export type CallWorkspaceActionRequest = ActionRequest<{ workspace: Workspace }>;
export type CallFolderActionRequest = ActionRequest<{ folder: Folder }>;

export type PromptTextRequest = {
  id: string;
  title: string;
  label?: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
};

export type InternalEvent = {
  id: string;
  replyId?: string | null;
  pluginName: string;
  pluginRefId: string;
  context?: unknown;
  payload:
    | (PromptTextRequest & { type: "prompt_text_request" })
    | { type: "prompt_text_response"; value: string | null }
    | {
        type: "prompt_form_request";
        id: string;
        title: string;
        description?: string;
        size?: DialogSize;
        inputs: FormInput[];
        confirmText?: string;
        cancelText?: string;
      }
    | {
        type: "prompt_form_response";
        values: Record<string, JsonPrimitive> | null;
        done: boolean;
      };
};

export type FilterResponse = {
  content: string | null;
  error?: string | null;
};

export type PluginMetadata = {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
};

// Plugin management functions are no longer supported in Yakumo API
// All authentication and template functions are now built-in

export async function searchPlugins(_query: string) {
  console.warn("Plugin search is no longer supported");
  return { plugins: [] };
}

export async function installPlugin(_name: string, _version: string | null) {
  console.warn("Plugin installation is no longer supported");
}

export async function uninstallPlugin(_pluginId: string) {
  console.warn("Plugin uninstallation is no longer supported");
}

export async function checkPluginUpdates() {
  console.warn("Plugin updates are no longer supported");
  return { updates: [] };
}

export async function updateAllPlugins() {
  console.warn("Plugin updates are no longer supported");
  return [];
}

export async function installPluginFromDirectory(_directory: string) {
  console.warn("Plugin installation from directory is no longer supported");
}
