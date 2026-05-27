import { Button } from "../../components/core/Button";
import { Checkbox } from "../../components/core/Checkbox";
import { Select } from "../../components/core/Select";
import { HStack } from "../../components/core/Stacks";

export function WorkspaceSecretAuditFilters({
  totalCount,
  filteredCount,
  secretKindFilter,
  setSecretKindFilter,
  secretStorageFilter,
  setSecretStorageFilter,
  secretKindOptions,
  secretStorageOptions,
  secretOrphanOnly,
  setSecretOrphanOnly,
  secretHotspotsOnly,
  setSecretHotspotsOnly,
  secretSearch,
  setSecretSearch,
  secretSort,
  setSecretSort,
  hasActiveSecretFilters,
  onReset,
  hotspotThreshold,
}: {
  totalCount: number;
  filteredCount: number;
  secretKindFilter: string;
  setSecretKindFilter: (value: string) => void;
  secretStorageFilter: string;
  setSecretStorageFilter: (value: string) => void;
  secretKindOptions: Array<{ label: string; value: string }>;
  secretStorageOptions: Array<{ label: string; value: string }>;
  secretOrphanOnly: boolean;
  setSecretOrphanOnly: (value: boolean) => void;
  secretHotspotsOnly: boolean;
  setSecretHotspotsOnly: (value: boolean) => void;
  secretSearch: string;
  setSecretSearch: (value: string) => void;
  secretSort: string;
  setSecretSort: (value: string) => void;
  hasActiveSecretFilters: boolean;
  onReset: () => void;
  hotspotThreshold: number;
}) {
  return (
    <>
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          name="yaku-secret-kind-filter"
          label="Secret Kind"
          size="xs"
          value={secretKindFilter}
          options={secretKindOptions}
          onChange={setSecretKindFilter}
        />
        <Select
          name="yaku-secret-storage-filter"
          label="Storage"
          size="xs"
          value={secretStorageFilter}
          options={secretStorageOptions}
          onChange={setSecretStorageFilter}
        />
      </div>
      <input
        value={secretSearch}
        onChange={(event) => setSecretSearch(event.target.value)}
        placeholder="Search secret, request, path, metadata"
        className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-subtlest focus:border-border-strong focus:ring-1 focus:ring-border-strong"
      />
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem]">
        <Checkbox
          checked={secretOrphanOnly}
          onChange={setSecretOrphanOnly}
          title="Show orphans only"
        />
        <Checkbox
          checked={secretHotspotsOnly}
          onChange={setSecretHotspotsOnly}
          title={`Only ${hotspotThreshold}+ references`}
        />
        <Select
          name="yaku-secret-sort"
          label="Sort"
          size="xs"
          value={secretSort}
          options={[
            { label: "Orphans First", value: "orphans_first" },
            { label: "Most Referenced", value: "most_referenced" },
            { label: "Name", value: "name" },
          ]}
          onChange={setSecretSort}
        />
      </div>
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <div className="text-[11px] text-text-subtle">
          {filteredCount} of {totalCount} shown
        </div>
        {hasActiveSecretFilters ? (
          <Button size="xs" type="button" variant="border" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </HStack>
    </>
  );
}
