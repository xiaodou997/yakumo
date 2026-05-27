import { Button } from "../../components/core/Button";
import { HStack } from "../../components/core/Stacks";
import type { BodyViewerKind } from "./BodyViewerTypes";

export function BodyViewerActions({
  viewerKind,
  textMode,
  setTextMode,
  canDownload,
  onDownload,
}: {
  viewerKind: BodyViewerKind;
  textMode: "pretty" | "raw";
  setTextMode: (value: "pretty" | "raw") => void;
  canDownload: boolean;
  onDownload: () => void;
}) {
  return (
    <HStack space={2} wrap>
      <Button
        size="xs"
        variant={textMode === "pretty" ? "solid" : "border"}
        disabled={viewerKind !== "json"}
        onClick={() => setTextMode("pretty")}
      >
        Pretty
      </Button>
      <Button
        size="xs"
        variant={textMode === "raw" ? "solid" : "border"}
        disabled={viewerKind !== "json"}
        onClick={() => setTextMode("raw")}
      >
        Raw
      </Button>
      <Button size="xs" variant="border" disabled={!canDownload} onClick={onDownload}>
        Download
      </Button>
    </HStack>
  );
}
