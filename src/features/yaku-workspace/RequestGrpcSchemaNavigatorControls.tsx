import { Button } from "../../components/core/Button";
import { Icon } from "../../components/core/Icon";
import { CheckboxField, fieldClassName } from "./RequestFieldPrimitives";
import { StatChip } from "./RequestProtocolCommon";

export function RequestGrpcSchemaNavigatorControls({
  visibleCount,
  filteredCount,
  totalCount,
  requiredCount,
  containerCount,
  filledCount,
  partialCount,
  missingCount,
  schemaFieldFilter,
  setSchemaFieldFilter,
  schemaRequiredOnly,
  setSchemaRequiredOnly,
  schemaContainersOnly,
  setSchemaContainersOnly,
  schemaUnfilledOnly,
  setSchemaUnfilledOnly,
  schemaRecentChangesOnly,
  setSchemaRecentChangesOnly,
  schemaChangedContainersOnly,
  setSchemaChangedContainersOnly,
  onExpandAllSchemaFields,
  onCollapseSchemaTree,
}: {
  visibleCount: number;
  filteredCount: number;
  totalCount: number;
  requiredCount: number;
  containerCount: number;
  filledCount: number;
  partialCount: number;
  missingCount: number;
  schemaFieldFilter: string;
  setSchemaFieldFilter: (value: string) => void;
  schemaRequiredOnly: boolean;
  setSchemaRequiredOnly: (value: boolean) => void;
  schemaContainersOnly: boolean;
  setSchemaContainersOnly: (value: boolean) => void;
  schemaUnfilledOnly: boolean;
  setSchemaUnfilledOnly: (value: boolean) => void;
  schemaRecentChangesOnly: boolean;
  setSchemaRecentChangesOnly: (value: boolean) => void;
  schemaChangedContainersOnly: boolean;
  setSchemaChangedContainersOnly: (value: boolean) => void;
  onExpandAllSchemaFields: () => void;
  onCollapseSchemaTree: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
            Field Navigator
          </div>
          <div className="mt-1 text-[11px] text-text-subtle">
            Browse discovered field paths and insert example values into the request message.
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-text-subtlest">
          {visibleCount}/{filteredCount}/{totalCount} fields
        </div>
      </div>
      <div className="relative mt-3">
        <Icon
          icon="search"
          size="xs"
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-subtlest"
        />
        <input
          value={schemaFieldFilter}
          onChange={(event) => setSchemaFieldFilter(event.target.value)}
          placeholder="Filter field paths or kinds"
          className={`${fieldClassName} pl-7`}
        />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <StatChip label="Required" value={String(requiredCount)} />
        <StatChip label="Containers" value={String(containerCount)} />
        <StatChip label="Leaves" value={String(totalCount - containerCount)} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <StatChip label="Filled" value={String(filledCount)} />
        <StatChip label="Partial" value={String(partialCount)} />
        <StatChip label="Missing" value={String(missingCount)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <CheckboxField checked={schemaRequiredOnly} onChange={setSchemaRequiredOnly}>
          Required only
        </CheckboxField>
        <CheckboxField checked={schemaContainersOnly} onChange={setSchemaContainersOnly}>
          Containers only
        </CheckboxField>
        <CheckboxField checked={schemaUnfilledOnly} onChange={setSchemaUnfilledOnly}>
          Missing required only
        </CheckboxField>
        <CheckboxField checked={schemaRecentChangesOnly} onChange={setSchemaRecentChangesOnly}>
          Recent changes only
        </CheckboxField>
        <CheckboxField
          checked={schemaChangedContainersOnly}
          onChange={setSchemaChangedContainersOnly}
        >
          Changed containers only
        </CheckboxField>
        <Button size="2xs" variant="border" onClick={onExpandAllSchemaFields}>
          Expand All
        </Button>
        <Button size="2xs" variant="border" onClick={onCollapseSchemaTree}>
          Collapse Tree
        </Button>
      </div>
    </>
  );
}
