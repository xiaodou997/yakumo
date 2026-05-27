import { VStack } from "../../components/core/Stacks";
import type { YakuSecretAuditItem } from "../../lib/yaku-client";
import { SecretAuditCard } from "./WorkspaceSecretAuditCards";

export function WorkspaceSecretAuditList({
  referencedSecretItems,
  orphanSecretItems,
  expandedSecretId,
  isDeleting,
  onDelete,
  onSelectRequest,
  onToggle,
}: {
  referencedSecretItems: YakuSecretAuditItem[];
  orphanSecretItems: YakuSecretAuditItem[];
  expandedSecretId: string;
  isDeleting: boolean;
  onDelete: (secretId: string) => void;
  onSelectRequest: (requestId: string) => void;
  onToggle: (secretId: string) => void;
}) {
  return (
    <VStack space={2}>
      {referencedSecretItems.length > 0 ? (
        <WorkspaceSecretAuditListSection
          title={`Referenced (${referencedSecretItems.length})`}
          items={referencedSecretItems}
          expandedSecretId={expandedSecretId}
          isDeleting={isDeleting}
          onDelete={onDelete}
          onSelectRequest={onSelectRequest}
          onToggle={onToggle}
        />
      ) : null}
      {orphanSecretItems.length > 0 ? (
        <WorkspaceSecretAuditListSection
          title={`Orphan (${orphanSecretItems.length})`}
          items={orphanSecretItems}
          expandedSecretId={expandedSecretId}
          isDeleting={isDeleting}
          onDelete={onDelete}
          onSelectRequest={onSelectRequest}
          onToggle={onToggle}
        />
      ) : null}
    </VStack>
  );
}

function WorkspaceSecretAuditListSection({
  title,
  items,
  expandedSecretId,
  isDeleting,
  onDelete,
  onSelectRequest,
  onToggle,
}: {
  title: string;
  items: YakuSecretAuditItem[];
  expandedSecretId: string;
  isDeleting: boolean;
  onDelete: (secretId: string) => void;
  onSelectRequest: (requestId: string) => void;
  onToggle: (secretId: string) => void;
}) {
  return (
    <VStack space={2}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">{title}</div>
      <VStack space={2}>
        {items.map((item) => (
          <SecretAuditCard
            key={item.secret.id}
            item={item}
            expanded={expandedSecretId === item.secret.id}
            isDeleting={isDeleting}
            onDelete={onDelete}
            onSelectRequest={onSelectRequest}
            onToggle={() => onToggle(item.secret.id)}
          />
        ))}
      </VStack>
    </VStack>
  );
}
