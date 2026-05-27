import { Button } from "../../components/core/Button";
import { HStack, VStack } from "../../components/core/Stacks";
import type { YakuSecretAuditItem } from "../../lib/yaku-client";

export function WorkspaceSecretAuditTopReferences({
  topReferencedRequests,
  topReferencedSecrets,
  topReferencedRequestPaths,
  onFocusRequest,
  onFocusRequestPath,
  onOpenRequest,
  onExpandSecret,
}: {
  topReferencedRequests: Array<{
    requestId: string;
    requestName: string;
    referenceCount: number;
    secretCount: number;
  }>;
  topReferencedSecrets: YakuSecretAuditItem[];
  topReferencedRequestPaths: Array<{
    requestId: string;
    requestName: string;
    nodePath: string;
    referenceCount: number;
  }>;
  onFocusRequest: (requestId: string, requestName: string) => void;
  onFocusRequestPath: (requestId: string, requestName: string, nodePath: string) => void;
  onOpenRequest: (requestId: string) => void;
  onExpandSecret: (secretId: string) => void;
}) {
  return (
    <>
      {topReferencedRequests.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
            Top Requests
          </div>
          <VStack space={1} className="mt-2">
            {topReferencedRequests.map((entry) => (
              <HStack
                key={`top-request-${entry.requestId}`}
                justifyContent="between"
                alignItems="center"
                className="gap-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-text">{entry.requestName}</div>
                  <div className="truncate text-[10px] text-text-subtlest">
                    {entry.referenceCount} references · {entry.secretCount} secrets
                  </div>
                </div>
                <HStack space={1} className="shrink-0">
                  <Button
                    size="2xs"
                    type="button"
                    variant="border"
                    onClick={() => onFocusRequest(entry.requestId, entry.requestName)}
                  >
                    Focus
                  </Button>
                  <Button
                    size="2xs"
                    type="button"
                    variant="border"
                    onClick={() => onOpenRequest(entry.requestId)}
                  >
                    Open
                  </Button>
                </HStack>
              </HStack>
            ))}
          </VStack>
        </div>
      ) : null}
      {topReferencedSecrets.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
            Top References
          </div>
          <VStack space={1} className="mt-2">
            {topReferencedSecrets.map((item) => (
              <HStack
                key={`top-secret-${item.secret.id}`}
                justifyContent="between"
                alignItems="center"
                className="gap-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-text">
                    {item.secret.name || item.secret.id}
                  </div>
                  <div className="truncate text-[10px] text-text-subtlest">
                    {item.references.length} references
                  </div>
                </div>
                <Button
                  size="2xs"
                  type="button"
                  variant="border"
                  onClick={() => onExpandSecret(item.secret.id)}
                >
                  Focus
                </Button>
              </HStack>
            ))}
          </VStack>
        </div>
      ) : null}
      {topReferencedRequestPaths.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
            Top Request Paths
          </div>
          <VStack space={1} className="mt-2">
            {topReferencedRequestPaths.map((entry) => (
              <HStack
                key={`top-request-path-${entry.requestId}-${entry.nodePath}`}
                justifyContent="between"
                alignItems="center"
                className="gap-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-text">{entry.requestName}</div>
                  <div className="truncate text-[10px] text-text-subtlest">
                    {entry.nodePath} · {entry.referenceCount} references
                  </div>
                </div>
                <HStack space={1} className="shrink-0">
                  <Button
                    size="2xs"
                    type="button"
                    variant="border"
                    onClick={() =>
                      onFocusRequestPath(entry.requestId, entry.requestName, entry.nodePath)
                    }
                  >
                    Focus Path
                  </Button>
                  <Button
                    size="2xs"
                    type="button"
                    variant="border"
                    onClick={() => onOpenRequest(entry.requestId)}
                  >
                    Open
                  </Button>
                </HStack>
              </HStack>
            ))}
          </VStack>
        </div>
      ) : null}
    </>
  );
}
