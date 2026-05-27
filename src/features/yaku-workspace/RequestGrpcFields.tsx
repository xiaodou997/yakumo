import { RequestGrpcBrowserSection } from "./RequestGrpcBrowserSection";
import { buildGrpcBrowserProps } from "./RequestGrpcBrowserPropsAssembler";
import { RequestGrpcMessageSection } from "./RequestGrpcMessageSection";
import { buildGrpcMessageProps } from "./RequestGrpcMessagePropsAssembler";
import { buildGrpcTransportProps } from "./RequestGrpcTransportPropsAssembler";
import { RequestGrpcTransportSection } from "./RequestGrpcTransportSection";
import { useGrpcDiscoveryState } from "./useGrpcDiscoveryState";
import { useGrpcSchemaEditorState } from "./useGrpcSchemaEditorState";
import type { ConfigPair } from "./types";

export function GrpcFields({
  url,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
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
  url: string;
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
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
}) {
  const discoveryState = useGrpcDiscoveryState({
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
  });
  const schemaState = useGrpcSchemaEditorState({
    selectedDiscoveredMethod: discoveryState.selectedDiscoveredMethod,
    selectedMethodShape: discoveryState.selectedMethodShape,
    grpcMessage,
    setGrpcMessage,
  });
  const browserProps = buildGrpcBrowserProps({
    grpcUseReflection,
    grpcService,
    setGrpcService,
    grpcMethod,
    setGrpcMethod,
    discoveryState,
    schemaState,
  });
  const messageProps = buildGrpcMessageProps({
    grpcMessage,
    setGrpcMessage,
    discoveryState,
    schemaState,
  });
  const transportProps = buildGrpcTransportProps({
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
  });

  return (
    <>
      <RequestGrpcBrowserSection {...browserProps} />
      <RequestGrpcMessageSection {...messageProps} />
      <RequestGrpcTransportSection {...transportProps} />
    </>
  );
}
