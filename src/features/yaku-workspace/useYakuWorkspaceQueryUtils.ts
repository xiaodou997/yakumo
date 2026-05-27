import type { YakuRequestNodePageItem } from "../../lib/yaku-client";

export function resolveSelectedId<T extends { id: string }>(
  items: T[],
  requestedId?: string,
) {
  if (requestedId != null && items.some((item) => item.id === requestedId)) {
    return requestedId;
  }
  return items[0]?.id;
}

export function resolveSelectedRequestId(
  items: Array<YakuRequestNodePageItem & { requestId: string }>,
  requestedId?: string,
) {
  if (requestedId != null && items.some((item) => item.requestId === requestedId)) {
    return requestedId;
  }
  return items[0]?.requestId;
}
