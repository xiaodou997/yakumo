// Types exported from generated bindings
export * from "./bindings/gen_models";
export * from "./bindings/gen_events";
import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  WebsocketRequest,
  Workspace,
} from "./bindings/gen_models";

// UI/action contracts for the built-in Yakumo feature layer.
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
  sourceId: string;
  functions: TemplateFunction[];
};

export type GetTemplateFunctionConfigResponse = {
  sourceId: string;
  function: TemplateFunction;
};

export type HttpAuthenticationConfig = {
  args: FormInput[];
  actions?: Array<{ label: string; icon?: string }>;
  sourceId?: string;
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
  sourceId: string;
  actions: TAction[];
};

type ActionRequest<TArgs extends Record<string, unknown>> = {
  sourceId: string;
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

export type FilterResponse = {
  content: string | null;
  error?: string | null;
};
