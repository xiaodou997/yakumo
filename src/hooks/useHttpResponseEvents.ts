import { invoke } from "@tauri-apps/api/core";
import type { HttpResponse, HttpResponseEvent } from "@yakumo-internal/models";
import {
  httpResponseEventsAtom,
  mergeModelsInStore,
  replaceModelsInStore,
} from "@yakumo-internal/models";
import { atom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { fireAndForget } from "../lib/fireAndForget";

const httpResponseEventsByResponseIdAtom = atom((get) => {
  const eventsByResponseId = new Map<string, HttpResponseEvent[]>();
  for (const event of get(httpResponseEventsAtom)) {
    const events = eventsByResponseId.get(event.responseId);
    if (events == null) {
      eventsByResponseId.set(event.responseId, [event]);
    } else {
      events.push(event);
    }
  }
  return eventsByResponseId;
});

export function useHttpResponseEvents(response: HttpResponse | null) {
  const eventsByResponseId = useAtomValue(httpResponseEventsByResponseIdAtom);

  useEffect(() => {
    if (response?.id == null) {
      replaceModelsInStore("http_response_event", []);
      return;
    }

    // Fetch events from database, filtering out events from other responses and merging atomically
    fireAndForget(
      invoke<HttpResponseEvent[]>("cmd_get_http_response_events", { responseId: response.id }).then(
        (events) =>
          mergeModelsInStore("http_response_event", events, (e) => e.responseId === response.id),
      ),
    );
  }, [response?.id]);

  const events = response?.id == null ? [] : (eventsByResponseId.get(response.id) ?? []);
  return { data: events, error: null, isLoading: false };
}
