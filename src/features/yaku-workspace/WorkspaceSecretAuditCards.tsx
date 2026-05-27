import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuSecretAuditItem } from "../../lib/yaku-client";
import { WorkspaceContextStatBlock } from "./WorkspaceContextShared";

export function SecretFacetSummary({
  title,
  groups,
}: {
  title: string;
  groups: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">{title}</div>
      {groups.length === 0 ? (
        <div className="mt-2 text-[11px] text-text-subtle">No groups in current result.</div>
      ) : (
        <div className="mt-2 space-y-1">
          {groups.map((group) => (
            <HStack
              key={`${title}-${group.label}`}
              justifyContent="between"
              alignItems="center"
              className="gap-2 text-[11px]"
            >
              <div className="truncate text-text-subtle">{group.label}</div>
              <div className="shrink-0 text-text">{group.count}</div>
            </HStack>
          ))}
        </div>
      )}
    </div>
  );
}

export function SecretAuditCard({
  item,
  expanded,
  isDeleting,
  onDelete,
  onSelectRequest,
  onToggle,
}: {
  item: YakuSecretAuditItem;
  expanded: boolean;
  isDeleting: boolean;
  onDelete: (secretId: string) => void;
  onSelectRequest: (requestId: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2">
      <HStack justifyContent="between" alignItems="start" className="gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-text">{item.secret.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-subtlest">
            <span>{item.kind ?? "unknown kind"}</span>
            <span>{item.storage ?? "unknown storage"}</span>
            <span>{item.orphan ? "orphan" : `${item.references.length} references`}</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-text-subtlest">{item.secret.id}</div>
        </div>
        <HStack space={1} className="shrink-0">
          {item.orphan ? (
            <Button
              size="xs"
              type="button"
              variant="border"
              color="danger"
              isLoading={isDeleting}
              onClick={() => onDelete(item.secret.id)}
            >
              Delete
            </Button>
          ) : null}
          <Button size="xs" type="button" variant="border" onClick={onToggle}>
            {expanded ? "Hide" : "Inspect"}
          </Button>
        </HStack>
      </HStack>
      {expanded ? (
        <div className="mt-2 rounded-lg border border-border-subtle bg-surface px-2 py-2">
          <VStack space={2}>
            <div className="grid gap-2 md:grid-cols-2">
              <WorkspaceContextStatBlock label="Created" value={item.secret.createdAt} />
              <WorkspaceContextStatBlock label="Updated" value={item.secret.updatedAt} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <WorkspaceContextStatBlock label="Kind" value={item.kind ?? "unknown"} />
              <WorkspaceContextStatBlock label="Storage" value={item.storage ?? "unknown"} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <WorkspaceContextStatBlock
                label="References"
                value={item.orphan ? "0" : String(item.references.length)}
              />
              <WorkspaceContextStatBlock label="State" value={item.orphan ? "orphan" : "referenced"} />
            </div>
            {Object.keys(item.secret.metadata).length > 0 ? (
              <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">Metadata</div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] text-text-subtle">
                  {JSON.stringify(item.secret.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
            {item.references.length === 0 ? (
              <div className="text-xs text-text-subtle">
                No request references. This secret is orphaned.
              </div>
            ) : (
              <VStack space={1}>
                {item.references.map((reference) => (
                  <div
                    key={`${item.secret.id}-${reference.requestId}-${reference.authField}`}
                    className="text-[11px] leading-5 text-text-subtle"
                  >
                    <span className="font-medium text-text">{reference.requestName}</span>
                    <span> · {reference.nodePath}</span>
                    <span>{" "}· {reference.authType} · {reference.authField}</span>
                    <div className="truncate text-text-subtlest">{reference.requestId}</div>
                    <div className="mt-1">
                      <Button
                        size="2xs"
                        type="button"
                        variant="border"
                        onClick={() => onSelectRequest(reference.requestId)}
                      >
                        Open Request
                      </Button>
                    </div>
                  </div>
                ))}
              </VStack>
            )}
          </VStack>
        </div>
      ) : null}
    </div>
  );
}
