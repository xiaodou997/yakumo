import { useMemo } from "react";
import { Button } from "../../components/core/Button";
import { Select } from "../../components/core/Select";
import { HStack } from "../../components/core/Stacks";
import type { YakuRequestNodePageItem } from "../../lib/yaku-client";
import { collectFolderDescendantIds } from "./workspaceTree";

export function NodeMoveControls({
  label,
  nodeId,
  currentParentId,
  currentFolderId,
  folderNodes,
  value,
  setValue,
  onMove,
  isLoading = false,
}: {
  label: string;
  nodeId: string;
  currentParentId: string | null | undefined;
  currentFolderId?: string;
  folderNodes: YakuRequestNodePageItem[];
  value: string;
  setValue: (value: string) => void;
  onMove: (parentId: string | null) => void;
  isLoading?: boolean;
}) {
  const excludedFolderIds = useMemo(() => {
    if (currentFolderId == null) return new Set<string>();
    const descendants = collectFolderDescendantIds(folderNodes, currentFolderId);
    return new Set([currentFolderId, ...descendants]);
  }, [currentFolderId, folderNodes]);

  const options = useMemo(
    () => [
      { label: "Root", value: "__root__" },
      ...folderNodes
        .filter((folder) => !excludedFolderIds.has(folder.id))
        .map((folder) => ({ label: folder.name, value: folder.id })),
    ],
    [excludedFolderIds, folderNodes],
  );

  const currentParentLabel =
    currentParentId == null
      ? "Root"
      : folderNodes.find((folder) => folder.id === currentParentId)?.name ?? currentParentId;

  const hasSelectedTarget = options.some((option) => option.value === value);
  const selectedValue = hasSelectedTarget ? value : "__root__";
  const isSameParent = (currentParentId ?? "__root__") === selectedValue;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">{label}</div>
      <div className="mb-3 text-xs text-text-subtle">Current parent: {currentParentLabel}</div>
      <Select
        name={`${label}-target-${nodeId}`}
        label="Target"
        value={selectedValue}
        options={options}
        onChange={setValue}
        size="sm"
      />
      <HStack space={2} wrap className="mt-3">
        <Button
          size="xs"
          variant="border"
          disabled={isSameParent}
          isLoading={isLoading}
          onClick={() => onMove(selectedValue === "__root__" ? null : selectedValue)}
        >
          Move
        </Button>
      </HStack>
    </div>
  );
}
