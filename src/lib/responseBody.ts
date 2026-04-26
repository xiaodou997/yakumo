import type { HttpResponse } from "@yakumo-internal/models";
import type { FilterResponse } from "@yakumo/features";
import type { ServerSentEvent } from "@yakumo-internal/sse";
import { invokeCmd } from "./tauri";

export async function getResponseBodyText({
  response,
  filter,
}: {
  response: HttpResponse;
  filter: string | null;
}): Promise<string | null> {
  const result = await invokeCmd<FilterResponse>("cmd_http_response_body", {
    responseId: response.id,
    filter,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.content;
}

export async function getResponseBodyEventSource(
  response: HttpResponse,
): Promise<ServerSentEvent[]> {
  if (!response.bodyPath) return [];
  return invokeCmd<ServerSentEvent[]>("cmd_get_sse_events", {
    responseId: response.id,
  });
}

export async function getResponseBodyBytes(
  response: HttpResponse,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const data = await invokeCmd<number[] | null>("cmd_http_response_body_bytes", {
    responseId: response.id,
  });
  return data == null ? null : new Uint8Array(data);
}
