import type { RequestGrpcDiscoveryPanelProps } from "./RequestGrpcTypes";
import { RequestGrpcDiscoveryHeader } from "./RequestGrpcDiscoveryHeader";
import { RequestGrpcDiscoveryInputs } from "./RequestGrpcDiscoveryInputs";
import { RequestGrpcDiscoveryResults } from "./RequestGrpcDiscoveryResults";

export function RequestGrpcDiscoveryPanel({
  grpcUseReflection,
  canDiscover,
  discoveryRevision,
  isDiscovering,
  discoveryError,
  discoveredServices,
  filteredServices,
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  serviceFilter,
  setServiceFilter,
  serviceOptions,
  methodOptions,
  fallbackServiceName,
  fallbackMethodValue,
  selectedDiscoveredService,
  onDiscover,
  onSelectDiscoveredService,
  onSelectDiscoveredMethod,
  onFocusService,
  onApplyDiscoveredMethod,
}: RequestGrpcDiscoveryPanelProps) {
  return (
    <>
      <RequestGrpcDiscoveryHeader
        grpcUseReflection={grpcUseReflection}
        discoveryRevision={discoveryRevision}
        isDiscovering={isDiscovering}
        canDiscover={canDiscover}
        onDiscover={onDiscover}
      />
      <RequestGrpcDiscoveryInputs
        grpcService={grpcService}
        setGrpcService={setGrpcService}
        grpcMethod={grpcMethod}
        setGrpcMethod={setGrpcMethod}
        serviceFilter={serviceFilter}
        setServiceFilter={setServiceFilter}
      />
      <RequestGrpcDiscoveryResults
        grpcUseReflection={grpcUseReflection}
        canDiscover={canDiscover}
        discoveryError={discoveryError}
        discoveryRevision={discoveryRevision}
        discoveredServices={discoveredServices}
        filteredServices={filteredServices}
        serviceOptions={serviceOptions}
        methodOptions={methodOptions}
        fallbackServiceName={fallbackServiceName}
        fallbackMethodValue={fallbackMethodValue}
        selectedDiscoveredService={selectedDiscoveredService}
        onSelectDiscoveredService={onSelectDiscoveredService}
        onSelectDiscoveredMethod={onSelectDiscoveredMethod}
        onFocusService={onFocusService}
        onApplyDiscoveredMethod={onApplyDiscoveredMethod}
      />
    </>
  );
}
