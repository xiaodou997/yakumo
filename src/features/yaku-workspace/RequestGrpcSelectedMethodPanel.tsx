import { Button } from "../../components/core/Button";
import { RequestGrpcRequiredFillSection } from "./RequestGrpcRequiredFillSection";
import { RequestGrpcSchemaNavigatorSection } from "./RequestGrpcSchemaNavigatorSection";
import { RequestGrpcSchemaPreviewSection } from "./RequestGrpcSchemaPreviewSection";
import { RequestGrpcSelectedMethodOverview } from "./RequestGrpcSelectedMethodOverview";
import type { RequestGrpcSelectedMethodPanelProps } from "./RequestGrpcTypes";

export function RequestGrpcSelectedMethodPanel({
  selectedDiscoveredService,
  selectedDiscoveredMethod,
  overview,
  requiredFill,
  schemaPreview,
  schemaNavigator,
  onReplaceMessage,
  onFillMissing,
}: RequestGrpcSelectedMethodPanelProps) {
  const { selectedMethodShape: navigatorMethodShape } = schemaNavigator;
  const { selectedMethodShape } = overview;

  return (
    <>
      <div className="rounded-lg border border-border-subtle bg-surface-highlight/30 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
          Selected Method
        </div>
        {selectedDiscoveredService != null && selectedDiscoveredMethod != null ? (
          <>
            <RequestGrpcSelectedMethodOverview
              serviceName={selectedDiscoveredService.name}
              methodName={selectedDiscoveredMethod.name}
              navigatorMethodShape={navigatorMethodShape}
              overview={overview}
              onReplaceMessage={onReplaceMessage}
              onFillMissing={onFillMissing}
              onFillMissingRequired={requiredFill.onFillMissingRequired}
            />
            <RequestGrpcRequiredFillSection
              requiredFill={requiredFill}
              selectedMethodShape={selectedMethodShape}
            />
            <RequestGrpcSchemaNavigatorSection {...schemaNavigator} />
            <RequestGrpcSchemaPreviewSection schemaPreview={schemaPreview} />
          </>
        ) : (
          <div className="mt-3 text-xs text-text-subtle">
            Pick a discovered method to inspect its input schema.
          </div>
        )}
      </div>
    </>
  );
}
