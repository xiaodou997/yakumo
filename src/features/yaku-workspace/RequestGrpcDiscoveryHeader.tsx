import { Button } from "../../components/core/Button";
import { Icon } from "../../components/core/Icon";

export function RequestGrpcDiscoveryHeader({
  grpcUseReflection,
  discoveryRevision,
  isDiscovering,
  canDiscover,
  onDiscover,
}: {
  grpcUseReflection: boolean;
  discoveryRevision: number;
  isDiscovering: boolean;
  canDiscover: boolean;
  onDiscover: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
          Schema Browser
        </div>
        <div className="mt-1 text-xs text-text-subtle">
          {grpcUseReflection
            ? "Browse services exposed by server reflection for this endpoint."
            : "Browse services from the selected local proto files and import roots."}
        </div>
      </div>
      <Button
        size="2xs"
        variant="border"
        isLoading={isDiscovering}
        disabled={!canDiscover}
        leftSlot={<Icon icon="refresh" size="2xs" />}
        onClick={onDiscover}
      >
        {discoveryRevision === 0 ? "Discover" : "Refresh"}
      </Button>
    </div>
  );
}
