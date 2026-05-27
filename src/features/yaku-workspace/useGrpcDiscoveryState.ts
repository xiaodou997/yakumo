import type { ConfigPair } from "./types";
import { useGrpcDiscoveryQueryState } from "./useGrpcDiscoveryQueryState";
import { useGrpcDiscoverySelectionState } from "./useGrpcDiscoverySelectionState";

export function useGrpcDiscoveryState({
  url,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMetadata,
  grpcProtoImportRoots,
  grpcProtoFiles,
  grpcUseReflection,
  grpcMessage,
  setGrpcMessage,
}: {
  url: string;
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMetadata: ConfigPair[];
  grpcProtoImportRoots: string;
  grpcProtoFiles: string;
  grpcUseReflection: boolean;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
}) {
  const queryState = useGrpcDiscoveryQueryState({
    url,
    grpcMetadata,
    grpcProtoImportRoots,
    grpcProtoFiles,
    grpcUseReflection,
  });
  const selectionState = useGrpcDiscoverySelectionState({
    grpcService,
    setGrpcService,
    grpcMethod,
    setGrpcMethod,
    grpcMessage,
    setGrpcMessage,
    discoveredServices: [...(queryState.grpcServicesQuery.data ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    serviceFilter: queryState.serviceFilter,
  });

  return {
    ...queryState,
    ...selectionState,
  };
}
