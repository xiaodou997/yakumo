import { VStack } from "../../components/core/Stacks";
import { summarizeRequestConfig } from "./requestConfig";
import { RequestConfigSummaryGrid } from "./RequestConfigSummaryGrid";
import { RequestEditorProtocolFields } from "./RequestEditorProtocolFields";
import type {
  RequestConfigSummaryProps,
  RequestStructuredEditorProps,
} from "./RequestEditorTypes";
import { RequestEditorUrlField } from "./RequestEditorUrlField";

export function RequestStructuredEditor({
  protocol,
  draft,
  cookieJars = [],
}: RequestStructuredEditorProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Structured Config
      </div>
      <VStack space={2}>
        <RequestEditorUrlField
          protocol={protocol}
          url={draft.url}
          setUrl={draft.setUrl}
        />
        <RequestEditorProtocolFields
          protocol={protocol}
          draft={draft}
          cookieJars={cookieJars}
        />
      </VStack>
    </div>
  );
}

export function RequestConfigSummary({
  protocol,
  config,
}: RequestConfigSummaryProps) {
  const entries = summarizeRequestConfig(protocol, config);
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-text-subtlest">
        Protocol Summary
      </div>
      <RequestConfigSummaryGrid entries={entries} />
    </div>
  );
}
