export type JsonSchemaNode = {
  type?: string;
  format?: string;
  properties?: Record<string, JsonSchemaNode>;
  enum?: string[];
  additionalProperties?: JsonSchemaNode;
  required?: string[];
  items?: JsonSchemaNode;
  $defs?: Record<string, JsonSchemaNode>;
  $ref?: string;
};

export type GrpcSchemaFieldEntry = {
  path: string;
  displayName: string;
  parentPath: string | null;
  depth: number;
  kind: string;
  required: boolean;
  isContainer: boolean;
  childCount: number;
  example: unknown;
  branchExample: unknown;
  examplePreview: string;
  messageState: "filled" | "partial" | "missing";
};
