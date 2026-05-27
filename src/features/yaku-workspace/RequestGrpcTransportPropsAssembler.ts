import type { RequestGrpcTransportSectionProps } from "./RequestGrpcTypes";
import type { ConfigPair } from "./types";

export function buildGrpcTransportProps({
  grpcMetadata,
  setGrpcMetadata,
  grpcProtoImportRoots,
  setGrpcProtoImportRoots,
  grpcProtoFiles,
  setGrpcProtoFiles,
  grpcUseReflection,
  setGrpcUseReflection,
  timeoutMs,
  setTimeoutMs,
}: {
  grpcMetadata: ConfigPair[];
  setGrpcMetadata: (pairs: ConfigPair[]) => void;
  grpcProtoImportRoots: string;
  setGrpcProtoImportRoots: (value: string) => void;
  grpcProtoFiles: string;
  setGrpcProtoFiles: (value: string) => void;
  grpcUseReflection: boolean;
  setGrpcUseReflection: (value: boolean) => void;
  timeoutMs: string;
  setTimeoutMs: (value: string) => void;
}): RequestGrpcTransportSectionProps {
  return {
    grpcMetadata,
    setGrpcMetadata,
    grpcProtoImportRoots,
    setGrpcProtoImportRoots,
    grpcProtoFiles,
    setGrpcProtoFiles,
    grpcUseReflection,
    setGrpcUseReflection,
    timeoutMs,
    setTimeoutMs,
  };
}
