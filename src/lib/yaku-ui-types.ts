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

export type ShowToastRequest = {
  message: string;
  color?: Color;
  icon?: string;
  timeout?: number;
};

export type ThemeComponents = {
  dialog?: ThemeComponentColors;
  menu?: ThemeComponentColors;
  toast?: ThemeComponentColors;
  sidebar?: ThemeComponentColors;
  responsePane?: ThemeComponentColors;
  appHeader?: ThemeComponentColors;
  button?: ThemeComponentColors;
  banner?: ThemeComponentColors;
  templateTag?: ThemeComponentColors;
  urlBar?: ThemeComponentColors;
  editor?: ThemeComponentColors;
  input?: ThemeComponentColors;
};

export type ThemeComponentColors = {
  surface?: string;
  surfaceHighlight?: string;
  surfaceActive?: string;
  text?: string;
  textSubtle?: string;
  textSubtlest?: string;
  border?: string;
  borderSubtle?: string;
  borderFocus?: string;
  shadow?: string;
  backdrop?: string;
  selection?: string;
  primary?: string;
  secondary?: string;
  info?: string;
  success?: string;
  notice?: string;
  warning?: string;
  danger?: string;
};

export type Theme = {
  id: string;
  label: string;
  dark: boolean;
  base: ThemeComponentColors;
  components?: ThemeComponents;
};
