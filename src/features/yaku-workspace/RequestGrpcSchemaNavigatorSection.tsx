import type { GrpcSchemaFieldEntry } from "./RequestGrpcSchemaTypes";
import { RequestGrpcSchemaNavigatorControls } from "./RequestGrpcSchemaNavigatorControls";
import { RequestGrpcSchemaNavigatorFieldCard } from "./RequestGrpcSchemaNavigatorFieldCard";

export function RequestGrpcSchemaNavigatorSection({
  visibleSelectedMethodFields,
  filteredSelectedMethodFields,
  selectedMethodFields,
  selectedMethodContainerFieldCount,
  selectedMethodFilledFieldCount,
  selectedMethodPartialFieldCount,
  selectedMethodMissingFieldCount,
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
  expandedSchemaPaths,
  recentChangedPathSet,
  lastInsertedFieldPath,
  selectedMethodShape,
  onExpandAllSchemaFields,
  onCollapseSchemaTree,
  onToggleSchemaPath,
  onInsertGrpcBranch,
  onInsertGrpcField,
}: {
  visibleSelectedMethodFields: GrpcSchemaFieldEntry[];
  filteredSelectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodFields: GrpcSchemaFieldEntry[];
  selectedMethodContainerFieldCount: number;
  selectedMethodFilledFieldCount: number;
  selectedMethodPartialFieldCount: number;
  selectedMethodMissingFieldCount: number;
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
  expandedSchemaPaths: string[];
  recentChangedPathSet: Set<string>;
  lastInsertedFieldPath: string;
  selectedMethodShape: "unary" | "streaming" | null;
  onExpandAllSchemaFields: () => void;
  onCollapseSchemaTree: () => void;
  onToggleSchemaPath: (path: string) => void;
  onInsertGrpcBranch: (field: GrpcSchemaFieldEntry) => void;
  onInsertGrpcField: (field: GrpcSchemaFieldEntry) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border-subtle bg-surface px-3 py-3">
      <RequestGrpcSchemaNavigatorControls
        visibleCount={visibleSelectedMethodFields.length}
        filteredCount={filteredSelectedMethodFields.length}
        totalCount={selectedMethodFields.length}
        requiredCount={selectedMethodFields.filter((field) => field.required).length}
        containerCount={selectedMethodContainerFieldCount}
        filledCount={selectedMethodFilledFieldCount}
        partialCount={selectedMethodPartialFieldCount}
        missingCount={selectedMethodMissingFieldCount}
        schemaFieldFilter={schemaFieldFilter}
        setSchemaFieldFilter={setSchemaFieldFilter}
        schemaRequiredOnly={schemaRequiredOnly}
        setSchemaRequiredOnly={setSchemaRequiredOnly}
        schemaContainersOnly={schemaContainersOnly}
        setSchemaContainersOnly={setSchemaContainersOnly}
        schemaUnfilledOnly={schemaUnfilledOnly}
        setSchemaUnfilledOnly={setSchemaUnfilledOnly}
        schemaRecentChangesOnly={schemaRecentChangesOnly}
        setSchemaRecentChangesOnly={setSchemaRecentChangesOnly}
        schemaChangedContainersOnly={schemaChangedContainersOnly}
        setSchemaChangedContainersOnly={setSchemaChangedContainersOnly}
        onExpandAllSchemaFields={onExpandAllSchemaFields}
        onCollapseSchemaTree={onCollapseSchemaTree}
      />
      {visibleSelectedMethodFields.length === 0 ? (
        <div className="mt-3 text-xs text-text-subtle">
          No schema fields match the current filter.
        </div>
      ) : (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {visibleSelectedMethodFields.map((field) => (
            <RequestGrpcSchemaNavigatorFieldCard
              key={field.path}
              field={field}
              isExpanded={expandedSchemaPaths.includes(field.path)}
              isRecentlyChanged={recentChangedPathSet.has(field.path)}
              isLastInserted={lastInsertedFieldPath === field.path}
              selectedMethodShape={selectedMethodShape}
              onToggleSchemaPath={onToggleSchemaPath}
              onInsertGrpcBranch={onInsertGrpcBranch}
              onInsertGrpcField={onInsertGrpcField}
            />
          ))}
        </div>
      )}
    </div>
  );
}
