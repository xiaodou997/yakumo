import type { YakuRunEvent } from "../../lib/yaku-client";
import {
  asOptionalNumber,
  asOptionalString,
} from "./RunEventParserCommon";

export function parseWebSocketMessageEvent(event: YakuRunEvent) {
  if (event.kind !== "message") {
    return null;
  }
  const direction = asOptionalString(event.data.direction);
  const kind = asOptionalString(event.data.kind);
  if (direction == null || kind == null) {
    return null;
  }

  return {
    direction,
    kind,
    messageIndex: asOptionalNumber(event.data.messageIndex),
    directionIndex: asOptionalNumber(event.data.directionIndex),
    byteLength: asOptionalNumber(event.data.byteLength),
    text: asOptionalString(event.data.text) ?? null,
    hex: asOptionalString(event.data.hex) ?? null,
  };
}

export function parseErrorMessageEvent(event: YakuRunEvent) {
  if (event.kind !== "error") {
    return null;
  }
  const message = asOptionalString(event.data.message);
  return message == null ? null : { message };
}
