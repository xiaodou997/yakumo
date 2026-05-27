import { CheckboxField, PairListEditor } from "./RequestFieldPrimitives";
import { PathListField } from "./RequestGrpcPathListField";
import { TimeoutField } from "./RequestProtocolCommon";
import type { RequestGrpcTransportSectionProps } from "./RequestGrpcTypes";

export function RequestGrpcTransportSection({
  grpcMetadata,
  setGrpcMetadata,
  grpcProtoImportRoots,
  setGrpcProtoImportRoots,
  grpcProtoFiles,
  setGrpcProtoFiles,
  grpcUseReflection,
  setGrpcUseReflection,
  timeoutMs,
  setTimeoutMs,
}: RequestGrpcTransportSectionProps) {
  return (
    <>
      <PairListEditor
        title="Metadata"
        pairs={grpcMetadata}
        setPairs={setGrpcMetadata}
        namePlaceholder="Metadata"
        valuePlaceholder="Value"
      />
      <PathListField
        title="Proto Import Roots"
        description="Optional directories used to resolve shared proto imports when reflection is disabled."
        value={grpcProtoImportRoots}
        setValue={setGrpcProtoImportRoots}
        placeholder="/absolute/path/to/proto\n/absolute/path/to/vendor"
        browseLabel="Add Root"
        noun="Folder"
        directory
      />
      <PathListField
        title="Proto Files"
        description="Entry-point proto files used for local discovery and request encoding when reflection is disabled."
        value={grpcProtoFiles}
        setValue={setGrpcProtoFiles}
        placeholder="/absolute/path/to/service.proto\n/absolute/path/to/imports.proto"
        browseLabel="Add Proto Files"
        noun="Proto File"
        fileExtensions={["proto"]}
      />
      <div className="rounded-xl border border-border-subtle bg-surface p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
          Transport
        </div>
        <div className="mt-1 text-[11px] text-text-subtle">
          Reflection controls discovery. Timeout applies to the unary request
          send path.
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <CheckboxField
            checked={grpcUseReflection}
            onChange={setGrpcUseReflection}
          >
            Use reflection
          </CheckboxField>
        </div>
        <div className="mt-3">
          <TimeoutField
            value={timeoutMs}
            onChange={setTimeoutMs}
            allowUnset
            description="Leave unset to use the default transport timeout."
          />
        </div>
      </div>
    </>
  );
}
