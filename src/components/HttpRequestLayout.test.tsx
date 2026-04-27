import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { CSSProperties, ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { workspaceLayoutAtom } from "../lib/atoms";
import { HttpRequestLayout } from "./HttpRequestLayout";
import { showGraphQLDocExplorerAtom } from "./graphql/graphqlAtoms";

const paneMocks = vi.hoisted(() => ({
  graphQLLayout: vi.fn(() => <div data-testid="graphql-layout">GraphQL Docs</div>),
  requestPane: vi.fn(() => <div data-testid="request-pane">Request</div>),
  responsePane: vi.fn(() => <div data-testid="response-pane">Response</div>),
}));

vi.mock("./graphql/GraphQLHttpRequestLayout", () => ({
  GraphQLHttpRequestLayout: paneMocks.graphQLLayout,
}));

vi.mock("../lib/atoms", async () => {
  const { atom } = await import("jotai");
  return { workspaceLayoutAtom: atom("horizontal") };
});

vi.mock("./graphql/graphqlAtoms", async () => {
  const { atom } = await import("jotai");
  return { showGraphQLDocExplorerAtom: atom({}) };
});

vi.mock("./HttpRequestPane", () => ({
  HttpRequestPane: paneMocks.requestPane,
}));

vi.mock("./HttpResponsePane", () => ({
  HttpResponsePane: paneMocks.responsePane,
}));

vi.mock("./core/SplitLayout", () => ({
  SplitLayout: ({
    firstSlot,
    secondSlot,
  }: {
    firstSlot: (props: { style: CSSProperties; orientation: "horizontal" }) => ReactNode;
    secondSlot: (props: { style: CSSProperties; orientation: "horizontal" }) => ReactNode;
  }) => (
    <div data-testid="split-layout">
      {firstSlot({ style: {}, orientation: "horizontal" })}
      {secondSlot({ style: {}, orientation: "horizontal" })}
    </div>
  ),
}));

function renderHttpLayout({
  bodyType,
  docExplorerState,
}: {
  bodyType: "json" | "graphql";
  docExplorerState?: Record<string, { field?: string; type?: string; parentType?: string }>;
}) {
  const store = createStore();
  store.set(workspaceLayoutAtom, "horizontal");
  store.set(showGraphQLDocExplorerAtom, docExplorerState ?? {});

  return render(
    <Provider store={store}>
      <Suspense>
        <HttpRequestLayout
          activeRequest={{
            id: "http_1",
            model: "http_request",
            bodyType,
          } as never}
          style={{}}
        />
      </Suspense>
    </Provider>,
  );
}

describe("HttpRequestLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("does not load the GraphQL docs layout for a non-GraphQL request", () => {
    renderHttpLayout({ bodyType: "json" });

    expect(screen.getByTestId("request-pane")).toBeTruthy();
    expect(screen.getByTestId("response-pane")).toBeTruthy();
    expect(screen.queryByTestId("graphql-layout")).toBeNull();
    expect(paneMocks.graphQLLayout).not.toHaveBeenCalled();
  });

  test("does not load the GraphQL docs layout until the explorer is opened", () => {
    renderHttpLayout({ bodyType: "graphql" });

    expect(screen.getByTestId("request-pane")).toBeTruthy();
    expect(screen.getByTestId("response-pane")).toBeTruthy();
    expect(screen.queryByTestId("graphql-layout")).toBeNull();
    expect(paneMocks.graphQLLayout).not.toHaveBeenCalled();
  });

  test("loads the GraphQL docs layout only when the GraphQL explorer has state", async () => {
    renderHttpLayout({
      bodyType: "graphql",
      docExplorerState: { http_1: { field: "viewer" } },
    });

    expect(await screen.findByTestId("graphql-layout")).toBeTruthy();
    expect(paneMocks.graphQLLayout).toHaveBeenCalledTimes(1);
  });
});
