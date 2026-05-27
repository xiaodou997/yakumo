import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listYakuGrpcServices } from "../../lib/yaku-client";
import type { ConfigPair } from "./types";
import { grpcMetadataMap, splitNonEmptyLines } from "./RequestGrpcDiscoveryModel";

export function useGrpcDiscoveryQueryState({
  url,
  grpcMetadata,
  grpcProtoImportRoots,
  grpcProtoFiles,
  grpcUseReflection,
}: {
  url: string;
  grpcMetadata: ConfigPair[];
  grpcProtoImportRoots: string;
  grpcProtoFiles: string;
  grpcUseReflection: boolean;
}) {
  const normalizedUrl = url.trim();
  const normalizedProtoImportRoots = useMemo(
    () => splitNonEmptyLines(grpcProtoImportRoots),
    [grpcProtoImportRoots],
  );
  const normalizedProtoFiles = useMemo(
    () => splitNonEmptyLines(grpcProtoFiles),
    [grpcProtoFiles],
  );
  const discoveryMetadata = useMemo(
    () => grpcMetadataMap(grpcMetadata),
    [grpcMetadata],
  );
  const [discoveryRevision, setDiscoveryRevision] = useState(0);
  const [serviceFilter, setServiceFilter] = useState("");

  const canDiscover =
    normalizedUrl !== "" &&
    (grpcUseReflection || normalizedProtoFiles.length > 0);
  const discoverySignature = useMemo(
    () =>
      JSON.stringify({
        url: normalizedUrl,
        metadata: discoveryMetadata,
        protoFiles: normalizedProtoFiles,
        protoImportRoots: normalizedProtoImportRoots,
        useReflection: grpcUseReflection,
      }),
    [
      discoveryMetadata,
      grpcUseReflection,
      normalizedProtoFiles,
      normalizedProtoImportRoots,
      normalizedUrl,
    ],
  );

  const grpcServicesQuery = useQuery({
    enabled: discoveryRevision > 0 && canDiscover,
    queryKey: ["yaku", "grpc-services", discoveryRevision, discoverySignature],
    queryFn: () =>
      listYakuGrpcServices({
        url: normalizedUrl,
        metadata: discoveryMetadata,
        protoFiles: normalizedProtoFiles,
        protoImportRoots: normalizedProtoImportRoots,
        useReflection: grpcUseReflection,
      }),
    staleTime: Infinity,
  });

  const refreshDiscovery = () => {
    setDiscoveryRevision((current) => current + 1);
  };
  const discoveredServices = useMemo(
    () =>
      [...(grpcServicesQuery.data ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [grpcServicesQuery.data],
  );

  return {
    normalizedUrl,
    normalizedProtoImportRoots,
    normalizedProtoFiles,
    discoveryMetadata,
    discoveryRevision,
    setDiscoveryRevision,
    serviceFilter,
    setServiceFilter,
    canDiscover,
    discoverySignature,
    grpcServicesQuery,
    discoveredServices,
    refreshDiscovery,
  };
}
