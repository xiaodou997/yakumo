import type { GrpcConnection } from "@yakumo-internal/models";
import { grpcConnectionsAtom } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";

export function useLatestGrpcConnection(requestId: string | null): GrpcConnection | null {
  return useAtomValue(grpcConnectionsAtom).find((c) => c.requestId === requestId) ?? null;
}
