import type { ReactNode } from "react";
import { Button } from "../../components/core/Button";
import { InlineCode } from "../../components/core/InlineCode";
import { HStack } from "../../components/core/Stacks";
import type { YakuCookieRecord } from "../../lib/yaku-client";

export function WorkspaceCookieJarActions({
  jarId,
  filteredCount,
  totalCount,
  hasCookieFilters,
  filteredCookies,
  batchDeleteScope,
  batchDeleteFeedback,
  onDeleteFiltered,
  onResetFilters,
}: {
  jarId: string;
  filteredCount: number;
  totalCount: number;
  hasCookieFilters: boolean;
  filteredCookies: YakuCookieRecord[];
  batchDeleteScope: string;
  batchDeleteFeedback: string;
  onDeleteFiltered: () => void;
  onResetFilters: () => void;
}) {
  return (
    <>
      <HStack justifyContent="between" alignItems="center" className="gap-2">
        <div className="text-[11px] text-text-subtle">
          {filteredCount} of {totalCount} cookies shown
        </div>
        <HStack space={1} className="shrink-0">
          {hasCookieFilters && filteredCookies.length > 0 ? (
            <Button
              size="2xs"
              type="button"
              variant="border"
              color="danger"
              isLoading={batchDeleteScope === "filtered"}
              onClick={onDeleteFiltered}
            >
              Delete Filtered
            </Button>
          ) : null}
          {hasCookieFilters ? (
            <Button size="2xs" type="button" variant="border" onClick={onResetFilters}>
              Reset
            </Button>
          ) : null}
        </HStack>
      </HStack>
      {batchDeleteFeedback !== "" ? (
        <div className="text-[11px] text-text-subtle">{batchDeleteFeedback}</div>
      ) : null}
    </>
  );
}
