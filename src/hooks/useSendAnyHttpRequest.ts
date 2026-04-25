import type { HttpResponse } from "@yakumo-internal/models";
import { getModel } from "@yakumo-internal/models";
import { invokeCmd } from "../lib/tauri";
import { getActiveCookieJar } from "./useActiveCookieJar";
import { getActiveEnvironment } from "./useActiveEnvironment";
import { createFastMutation, useFastMutation } from "./useFastMutation";

export function useSendAnyHttpRequest() {
  return useFastMutation<HttpResponse | null, string, string | null>({
    mutationKey: ["send_any_request"],
    mutationFn: async (id) => {
      const request = getModel("http_request", id ?? "n/a");
      if (request == null) {
        return null;
      }

      return invokeCmd("cmd_send_http_request", {
        request,
        environmentId: getActiveEnvironment()?.id,
        cookieJarId: getActiveCookieJar()?.id,
      });
    },
  });
}

export const sendAnyHttpRequest = createFastMutation<HttpResponse | null, string, string | null>({
  mutationKey: ["send_any_request"],
  mutationFn: async (id) => {
    const request = getModel("http_request", id ?? "n/a");
    if (request == null) {
      return null;
    }

    return invokeCmd("cmd_send_http_request", {
      request,
      environmentId: getActiveEnvironment()?.id,
      cookieJarId: getActiveCookieJar()?.id,
    });
  },
});
