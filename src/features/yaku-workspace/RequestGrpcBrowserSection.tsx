import { RequestGrpcDiscoveryPanel } from "./RequestGrpcDiscoveryPanel";
import { RequestGrpcSelectedMethodPanel } from "./RequestGrpcSelectedMethodPanel";
import type { RequestGrpcBrowserSectionProps } from "./RequestGrpcTypes";

export function RequestGrpcBrowserSection({
  discovery,
  selectedMethod,
}: RequestGrpcBrowserSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <RequestGrpcDiscoveryPanel {...discovery} />
      {selectedMethod != null ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <RequestGrpcSelectedMethodPanel {...selectedMethod} />
        </div>
      ) : null}
    </div>
  );
}
