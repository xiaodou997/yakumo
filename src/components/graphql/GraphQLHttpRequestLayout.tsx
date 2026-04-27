import type { HttpRequest } from "@yakumo-internal/models";
import classNames from "classnames";
import type { CSSProperties } from "react";
import { useCurrentGraphQLSchema } from "../../hooks/useIntrospectGraphQL";
import type { SplitLayoutLayout } from "../core/SplitLayout";
import { HttpRequestResponseSplit } from "../HttpRequestLayout";
import { SplitLayout } from "../core/SplitLayout";
import { GraphQLDocsExplorer } from "./GraphQLDocsExplorer";

interface Props {
  activeRequest: HttpRequest;
  style: CSSProperties;
  workspaceLayout: SplitLayoutLayout;
}

export function GraphQLHttpRequestLayout({ activeRequest, style, workspaceLayout }: Props) {
  const graphQLSchema = useCurrentGraphQLSchema(activeRequest);

  const requestResponseSplit = ({ style }: { style: CSSProperties }) => (
    <HttpRequestResponseSplit
      activeRequest={activeRequest}
      style={style}
      workspaceLayout={workspaceLayout}
    />
  );

  if (graphQLSchema == null) {
    return requestResponseSplit({ style });
  }

  return (
    <SplitLayout
      name="graphql_layout"
      defaultRatio={1 / 3}
      firstSlot={requestResponseSplit}
      secondSlot={({ style, orientation }) => (
        <GraphQLDocsExplorer
          requestId={activeRequest.id}
          schema={graphQLSchema}
          className={classNames(orientation === "horizontal" && "!ml-0")}
          style={style}
        />
      )}
    />
  );
}
