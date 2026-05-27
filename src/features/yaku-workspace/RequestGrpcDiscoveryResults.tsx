import { FormattedError } from "../../components/core/FormattedError";
import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { EmptyCopy } from "./WorkspacePanels";
import type { RequestGrpcDiscoveryPanelProps } from "./RequestGrpcTypes";

export function RequestGrpcDiscoveryResults({
  grpcUseReflection,
  canDiscover,
  discoveryError,
  discoveryRevision,
  discoveredServices,
  filteredServices,
  serviceOptions,
  methodOptions,
  fallbackServiceName,
  fallbackMethodValue,
  selectedDiscoveredService,
  onSelectDiscoveredService,
  onSelectDiscoveredMethod,
  onFocusService,
  onApplyDiscoveredMethod,
}: Pick<
  RequestGrpcDiscoveryPanelProps,
  | "grpcUseReflection"
  | "canDiscover"
  | "discoveryError"
  | "discoveryRevision"
  | "discoveredServices"
  | "filteredServices"
  | "serviceOptions"
  | "methodOptions"
  | "fallbackServiceName"
  | "fallbackMethodValue"
  | "selectedDiscoveredService"
  | "onSelectDiscoveredService"
  | "onSelectDiscoveredMethod"
  | "onFocusService"
  | "onApplyDiscoveredMethod"
>) {
  if (!canDiscover) {
    return (
      <div className="mt-3 text-xs text-text-subtle">
        {grpcUseReflection
          ? "Enter a gRPC URL to browse reflected services."
          : "Enter a gRPC URL and add at least one proto file to browse local schema."}
      </div>
    );
  }

  if (discoveryError != null) {
    return (
      <div className="mt-3">
        <FormattedError>{discoveryError}</FormattedError>
      </div>
    );
  }

  if (discoveredServices.length === 0 && discoveryRevision > 0) {
    return (
      <div className="mt-3">
        <EmptyCopy>No services discovered.</EmptyCopy>
      </div>
    );
  }

  if (discoveredServices.length > 0 && filteredServices.length === 0) {
    return (
      <div className="mt-3">
        <EmptyCopy>No services match the current filter.</EmptyCopy>
      </div>
    );
  }

  if (discoveredServices.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          name="yaku-grpc-discovered-service"
          label="Discovered Service"
          value={fallbackServiceName}
          options={serviceOptions}
          onChange={onSelectDiscoveredService}
          size="sm"
        />
        <Select
          name="yaku-grpc-discovered-method"
          label="Discovered Method"
          value={fallbackMethodValue}
          options={
            methodOptions.length > 0
              ? methodOptions
              : [{ label: "No methods", value: "__none__" }]
          }
          onChange={onSelectDiscoveredMethod}
          size="sm"
          disabled={selectedDiscoveredService == null || methodOptions.length === 0}
        />
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            Discovered Services
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            {filteredServices.length}/{discoveredServices.length} services
          </div>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredServices.map((service) => (
            <div
              key={service.name}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-left text-xs font-medium text-text"
                  onClick={() => onFocusService(service.name)}
                >
                  {service.name}
                </button>
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-subtlest">
                  {service.methods.length} methods
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {service.methods.map((method) => (
                  <Button
                    key={`${service.name}/${method.name}`}
                    size="2xs"
                    variant="border"
                    title={
                      method.clientStreaming || method.serverStreaming
                        ? "streaming"
                        : "unary"
                    }
                    onClick={() => onApplyDiscoveredMethod(service, method)}
                  >
                    {method.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
