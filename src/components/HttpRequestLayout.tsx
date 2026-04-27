import type { HttpRequest } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import type { CSSProperties } from "react";
import { lazy, Suspense } from "react";
import { workspaceLayoutAtom } from "../lib/atoms";
import type { SlotProps, SplitLayoutLayout } from "./core/SplitLayout";
import { SplitLayout } from "./core/SplitLayout";
import { showGraphQLDocExplorerAtom } from "./graphql/graphqlAtoms";
import { HttpRequestPane } from "./HttpRequestPane";
import { HttpResponsePane } from "./HttpResponsePane";

const GraphQLHttpRequestLayout = lazy(() =>
  import("./graphql/GraphQLHttpRequestLayout").then((m) => ({
    default: m.GraphQLHttpRequestLayout,
  })),
);

interface Props {
  activeRequest: HttpRequest;
  style: CSSProperties;
}

export function HttpRequestLayout({ activeRequest, style }: Props) {
  const showGraphQLDocExplorer = useAtomValue(showGraphQLDocExplorerAtom);
  const workspaceLayout = useAtomValue(workspaceLayoutAtom);

  if (
    activeRequest.bodyType === "graphql" &&
    showGraphQLDocExplorer[activeRequest.id] !== undefined
  ) {
    return (
      <Suspense fallback={<HttpRequestResponseSplit activeRequest={activeRequest} style={style} />}>
        <GraphQLHttpRequestLayout
          activeRequest={activeRequest}
          style={style}
          workspaceLayout={workspaceLayout}
        />
      </Suspense>
    );
  }

  return (
    <HttpRequestResponseSplit
      activeRequest={activeRequest}
      style={style}
      workspaceLayout={workspaceLayout}
    />
  );
}

export function HttpRequestResponseSplit({
  activeRequest,
  style,
  workspaceLayout,
}: Props & { workspaceLayout?: SplitLayoutLayout }) {
  const requestResponseSplit = ({ style }: Pick<SlotProps, "style">) => (
    <SplitLayout
      name="http_layout"
      className="p-3 gap-1.5"
      style={style}
      layout={workspaceLayout}
      firstSlot={({ orientation, style }) => (
        <HttpRequestPane
          style={style}
          activeRequest={activeRequest}
          fullHeight={orientation === "horizontal"}
        />
      )}
      secondSlot={({ style }) => (
        <HttpResponsePane activeRequestId={activeRequest.id} style={style} />
      )}
    />
  );

  return requestResponseSplit({ style });
}
