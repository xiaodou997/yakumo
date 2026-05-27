import { stringOrEmpty } from "./requestConfigSharedHelpers";
import { bodyObjectFromConfig } from "./requestConfigHttpBodyHelpers";

export function graphqlQuerySummary(config: Record<string, unknown>) {
  const query = stringOrEmpty(config.graphqlQuery) || graphqlBodyQueryFromConfig(config);
  if (query === "") return "unset";
  return query.length > 80 ? `${query.slice(0, 77)}...` : query;
}

export function graphqlVariablesSummary(config: Record<string, unknown>) {
  if (config.graphqlVariables != null) return "set";
  const body = bodyObjectFromConfig(config);
  return body?.variables != null ? "set" : "unset";
}

export function graphqlVariablesTextFromConfig(config: Record<string, unknown>) {
  if (config.graphqlVariables != null) {
    return JSON.stringify(config.graphqlVariables, null, 2);
  }
  const body = bodyObjectFromConfig(config);
  if (body?.variables != null) {
    return JSON.stringify(body.variables, null, 2);
  }
  return "";
}

export function graphqlBodyQueryFromConfig(config: Record<string, unknown>) {
  const body = bodyObjectFromConfig(config);
  return typeof body?.query === "string" ? body.query : "";
}

export function graphqlBodyOperationNameFromConfig(config: Record<string, unknown>) {
  const body = bodyObjectFromConfig(config);
  return typeof body?.operationName === "string" ? body.operationName : "";
}

export function graphqlBodyText(input: {
  graphqlQuery: string;
  graphqlVariables: string;
  graphqlOperationName: string;
}) {
  const body: Record<string, unknown> = {
    query: input.graphqlQuery,
  };
  const variables = graphqlVariablesObject(input);
  if (variables != null) {
    body.variables = variables;
  }
  const operationName = input.graphqlOperationName.trim();
  if (operationName !== "") {
    body.operationName = operationName;
  }
  return JSON.stringify(body, null, 2);
}

export function graphqlVariablesObject(input: { graphqlVariables: string }) {
  const text = input.graphqlVariables.trim();
  if (text === "") return null;
  const parsed = JSON.parse(text) as unknown;
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("GraphQL variables must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
