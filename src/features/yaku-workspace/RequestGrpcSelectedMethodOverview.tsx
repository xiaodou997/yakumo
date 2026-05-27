import { Button } from "../../components/core/Button";
import { StatChip } from "./RequestProtocolCommon";
import type {
  RequestGrpcSelectedMethodOverviewProps,
} from "./RequestGrpcTypes";

export function RequestGrpcSelectedMethodOverview({
  serviceName,
  methodName,
  navigatorMethodShape,
  overview,
  onReplaceMessage,
  onFillMissing,
  onFillMissingRequired,
}: {
  serviceName: string;
  methodName: string;
  navigatorMethodShape: "unary" | "streaming" | null;
  overview: RequestGrpcSelectedMethodOverviewProps;
  onReplaceMessage: () => void;
  onFillMissing: () => void;
  onFillMissingRequired: () => void;
}) {
  const {
    selectedMethodTemplate,
    selectedMethodShape,
    selectedMethodTemplateFieldCount,
    selectedMethodSchemaLineCount,
  } = overview;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="break-all text-xs text-text">
            {serviceName}/{methodName}
          </div>
          <div className="mt-1 text-[11px] text-text-subtle">
            {navigatorMethodShape === "unary" ? "unary" : "streaming"}
          </div>
          {selectedMethodShape !== "unary" ? (
            <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
              Yaku gRPC send currently supports unary methods only.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodTemplate == null || selectedMethodShape !== "unary"}
            onClick={onReplaceMessage}
          >
            Replace Message
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodTemplate == null || selectedMethodShape !== "unary"}
            onClick={onFillMissing}
          >
            Fill Missing
          </Button>
          <Button
            size="2xs"
            variant="border"
            disabled={selectedMethodShape !== "unary"}
            onClick={onFillMissingRequired}
          >
            Fill Missing Required
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <StatChip
          label="Shape"
          value={selectedMethodShape === "unary" ? "unary" : "streaming"}
        />
        <StatChip label="Schema Lines" value={String(selectedMethodSchemaLineCount)} />
        <StatChip
          label="Template Fields"
          value={String(selectedMethodTemplateFieldCount)}
        />
      </div>
    </>
  );
}
