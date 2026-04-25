import type { Environment } from "@yakumo-internal/models";
import { useKeyValue } from "./useKeyValue";

export function useEnvironmentValueVisibility(environment: Environment) {
  return useKeyValue<boolean>({
    namespace: "global",
    key: ["environmentValueVisibility", environment.workspaceId],
    fallback: false,
  });
}
