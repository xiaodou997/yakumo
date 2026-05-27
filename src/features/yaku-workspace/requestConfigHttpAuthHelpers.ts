import { stringOrEmpty } from "./requestConfigSharedHelpers";

export function buildHttpAuth(input: {
  httpAuthType: string;
  httpAuthUsername: string;
  httpAuthPassword: string;
  httpAuthToken: string;
  httpAuthPasswordSecretId: string;
  httpAuthTokenSecretId: string;
}) {
  const authType = input.httpAuthType.trim().toLowerCase();
  if (authType === "" || authType === "none") {
    return null;
  }
  if (authType === "basic") {
    return {
      type: "basic",
      username: input.httpAuthUsername,
      password:
        input.httpAuthPassword.trim() === "" ? undefined : input.httpAuthPassword,
      passwordSecretId:
        input.httpAuthPassword.trim() === ""
          ? input.httpAuthPasswordSecretId || undefined
          : undefined,
    };
  }
  if (authType === "bearer") {
    return {
      type: "bearer",
      token: input.httpAuthToken.trim() === "" ? undefined : input.httpAuthToken,
      tokenSecretId:
        input.httpAuthToken.trim() === ""
          ? input.httpAuthTokenSecretId || undefined
          : undefined,
    };
  }
  return { type: authType };
}

export function draftAuthFields(value: unknown) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      httpAuthType: "none",
      httpAuthUsername: "",
      httpAuthPassword: "",
      httpAuthToken: "",
      httpAuthPasswordSecretId: "",
      httpAuthTokenSecretId: "",
    };
  }
  const auth = value as Record<string, unknown>;
  return {
    httpAuthType: stringOrEmpty(auth.type) || "none",
    httpAuthUsername: stringOrEmpty(auth.username),
    httpAuthPassword: stringOrEmpty(auth.password),
    httpAuthToken: stringOrEmpty(auth.token),
    httpAuthPasswordSecretId: stringOrEmpty(auth.passwordSecretId),
    httpAuthTokenSecretId: stringOrEmpty(auth.tokenSecretId),
  };
}
