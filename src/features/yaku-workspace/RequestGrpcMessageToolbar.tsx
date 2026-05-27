import { Button } from "../../components/core/Button";

export function RequestGrpcMessageToolbar({
  grpcMessage,
  selectedMethodTemplate,
  selectedMethodShape,
  selectedMethodMissingRequiredFieldsCount,
  selectedMissingRequiredFieldsCount,
  recentChangedContainerPaths,
  lastFillSummary,
  onFormatMessage,
  onFillMissing,
  onFillMissingRequired,
  onFillSelectedRequired,
  onReviewRequired,
  onReviewChanges,
  onReviewChangedContainers,
}: {
  grpcMessage: string;
  selectedMethodTemplate: unknown | null;
  selectedMethodShape: "unary" | "streaming" | null;
  selectedMethodMissingRequiredFieldsCount: number;
  selectedMissingRequiredFieldsCount: number;
  recentChangedContainerPaths: string[];
  lastFillSummary: { title: string } | null;
  onFormatMessage: () => void;
  onFillMissing: () => void;
  onFillMissingRequired: () => void;
  onFillSelectedRequired: () => void;
  onReviewRequired: () => void;
  onReviewChanges: () => void;
  onReviewChangedContainers: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="2xs"
        variant="border"
        disabled={grpcMessage.trim() === ""}
        onClick={onFormatMessage}
      >
        Format JSON
      </Button>
      {selectedMethodTemplate != null ? (
        <Button
          size="2xs"
          variant="border"
          disabled={selectedMethodShape !== "unary"}
          onClick={onFillMissing}
        >
          Fill Missing
        </Button>
      ) : null}
      <Button
        size="2xs"
        variant="border"
        disabled={selectedMethodShape !== "unary"}
        onClick={onFillMissingRequired}
      >
        Fill Missing Required
      </Button>
      <Button
        size="2xs"
        variant="border"
        disabled={selectedMethodShape !== "unary" || selectedMissingRequiredFieldsCount === 0}
        onClick={onFillSelectedRequired}
      >
        Fill Selected
      </Button>
      <Button
        size="2xs"
        variant="border"
        disabled={selectedMethodMissingRequiredFieldsCount === 0}
        onClick={onReviewRequired}
      >
        Review Required
      </Button>
      <Button
        size="2xs"
        variant="border"
        disabled={lastFillSummary == null}
        onClick={onReviewChanges}
      >
        Review Changes
      </Button>
      <Button
        size="2xs"
        variant="border"
        disabled={recentChangedContainerPaths.length === 0}
        onClick={onReviewChangedContainers}
      >
        Review Changed Containers
      </Button>
    </div>
  );
}
