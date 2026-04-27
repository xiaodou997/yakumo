import type {
  Folder,
  GrpcRequest,
  HttpRequest,
  WebsocketRequest,
} from "@yakumo-internal/models";
import {
  foldersAtom,
  grpcRequestsAtom,
  httpRequestsAtom,
  websocketRequestsAtom,
} from "@yakumo-internal/models";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useFolderActions } from "../hooks/useFolderActions";
import { useLatestGrpcConnection } from "../hooks/useLatestGrpcConnection";
import { useLatestHttpResponse } from "../hooks/useLatestHttpResponse";
import { websocketConnectionsByRequestIdAtom } from "../hooks/usePinnedWebsocketConnection";
import { sendAnyHttpRequest } from "../hooks/useSendAnyHttpRequest";
import { fireAndForget } from "../lib/fireAndForget";
import { showDialog } from "../lib/dialog";
import { resolvedModelName } from "../lib/resolvedModelName";
import { router } from "../lib/router";
import { Button } from "./core/Button";
import { Heading } from "./core/Heading";
import { HttpResponseDurationTag } from "./core/HttpResponseDurationTag";
import { HttpStatusTag } from "./core/HttpStatusTag";
import { Icon } from "./core/Icon";
import { IconButton } from "./core/IconButton";
import { LoadingIcon } from "./core/LoadingIcon";
import { Separator } from "./core/Separator";
import { SizeTag } from "./core/SizeTag";
import { WebsocketStatusTag } from "./core/WebsocketStatusTag";
import { HStack } from "./core/Stacks";
import { HttpResponsePane } from "./HttpResponsePane";

interface Props {
  folder: Folder;
  style: CSSProperties;
}

export function FolderLayout({ folder, style }: Props) {
  const folders = useAtomValue(foldersAtom);
  const httpRequests = useAtomValue(httpRequestsAtom);
  const grpcRequests = useAtomValue(grpcRequestsAtom);
  const websocketRequests = useAtomValue(websocketRequestsAtom);
  const folderActions = useFolderActions();
  const sendAllAction = useMemo(
    () => folderActions.find((a) => a.label === "Send All"),
    [folderActions],
  );

  const children = useMemo(() => {
    return [
      ...folders.filter((f) => f.folderId === folder.id),
      ...httpRequests.filter((r) => r.folderId === folder.id),
      ...grpcRequests.filter((r) => r.folderId === folder.id),
      ...websocketRequests.filter((r) => r.folderId === folder.id),
    ];
  }, [folder.id, folders, grpcRequests, httpRequests, websocketRequests]);

  const handleSendAll = useCallback(() => {
    if (sendAllAction) fireAndForget(sendAllAction.call(folder));
  }, [sendAllAction, folder]);

  return (
    <div style={style} className="p-6 pt-4 overflow-y-auto @container">
      <HStack space={2} alignItems="center">
        <Icon icon="folder" size="xl" color="secondary" />
        <Heading level={1}>{resolvedModelName(folder)}</Heading>
        <HStack className="ml-auto" alignItems="center">
          <Button
            rightSlot={<Icon icon="send_horizontal" />}
            color="secondary"
            size="sm"
            variant="border"
            onClick={handleSendAll}
            disabled={sendAllAction == null}
          >
            Send All
          </Button>
        </HStack>
      </HStack>
      <Separator className="mt-3 mb-8" />
      <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3 gap-4 min-w-0">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
    </div>
  );
}

function ChildCard({ child }: { child: Folder | HttpRequest | GrpcRequest | WebsocketRequest }) {
  let card: ReactNode;
  if (child.model === "folder") {
    card = <FolderCard folder={child} />;
  } else if (child.model === "http_request") {
    card = <HttpRequestCard request={child} />;
  } else if (child.model === "grpc_request") {
    card = <RequestCard request={child} />;
  } else if (child.model === "websocket_request") {
    card = <RequestCard request={child} />;
  } else {
    card = <div>Unknown model</div>;
  }

  const navigate = useCallback(async () => {
    await router.navigate({
      to: "/workspaces/$workspaceId",
      params: { workspaceId: child.workspaceId },
      search: (prev) => ({
        ...prev,
        request_id: child.model === "folder" ? null : child.id,
        folder_id: child.model === "folder" ? child.id : null,
      }),
    });
  }, [child.id, child.model, child.workspaceId]);

  const handlePrimaryAction = useCallback(() => {
    if (child.model === "http_request") {
      sendAnyHttpRequest.mutate(child.id);
      return;
    }
    fireAndForget(navigate());
  }, [child.id, child.model, navigate]);

  const primaryTitle =
    child.model === "http_request"
      ? "Send Request"
      : child.model === "folder"
        ? "Open Folder"
        : "Open Request";

  return (
    <div
      className={classNames(
        "rounded-lg bg-surface-highlight p-3 pt-1 border border-border",
        "flex flex-col gap-3",
      )}
    >
      <HStack space={2}>
        {child.model === "folder" && <Icon icon="folder" size="lg" />}
        <Heading className="truncate" level={2}>
          {resolvedModelName(child)}
        </Heading>
        <HStack space={0.5} className="ml-auto -mr-1.5">
          <IconButton
            color="custom"
            title={child.model === "folder" ? "Open Folder" : "Open Request"}
            size="sm"
            icon="external_link"
            className="opacity-70 hover:opacity-100"
            onClick={navigate}
          />
          <IconButton
            color="custom"
            title={primaryTitle}
            size="sm"
            icon={child.model === "http_request" ? "send_horizontal" : "arrow_right"}
            className="opacity-70 hover:opacity-100"
            onClick={handlePrimaryAction}
          />
        </HStack>
      </HStack>
      <div className="text-text-subtle">{card}</div>
    </div>
  );
}

function FolderCard({ folder }: { folder: Folder }) {
  return (
    <div>
      <Button
        color="primary"
        onClick={async () => {
          await router.navigate({
            to: "/workspaces/$workspaceId",
            params: { workspaceId: folder.workspaceId },
            search: (prev) => {
              return { ...prev, request_id: null, folder_id: folder.id };
            },
          });
        }}
      >
        Open
      </Button>
    </div>
  );
}

function RequestCard({ request }: { request: HttpRequest | GrpcRequest | WebsocketRequest }) {
  if (request.model === "grpc_request") {
    return <GrpcRequestCard request={request} />;
  }
  if (request.model === "websocket_request") {
    return <WebsocketRequestCard request={request} />;
  }

  return (
    <div className="rounded border border-border-subtle px-2.5 py-2 font-mono text-xs text-text-subtle">
      Unsupported request type
    </div>
  );
}

function HttpRequestCard({ request }: { request: HttpRequest }) {
  const latestResponse = useLatestHttpResponse(request.id);

  return (
    <div className="grid grid-rows-2 grid-cols-[minmax(0,1fr)] gap-2 overflow-hidden">
      <code className="font-mono text-editor text-info border border-info rounded px-2.5 py-0.5 truncate w-full min-w-0">
        {request.method} {request.url}
      </code>
      {latestResponse ? (
        <button
          className="block mr-auto"
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            showDialog({
              id: "response-preview",
              title: "Response Preview",
              size: "md",
              className: "h-full",
              render: () => {
                return <HttpResponsePane activeRequestId={request.id} />;
              },
            });
          }}
        >
          <HStack
            space={2}
            alignItems="center"
            className={classNames(
              "cursor-default select-none",
              "whitespace-nowrap w-full pl-3 overflow-x-auto font-mono text-sm hide-scrollbars",
              "font-mono text-editor border rounded px-1.5 py-0.5 truncate w-full",
            )}
          >
            {latestResponse.state !== "closed" && <LoadingIcon size="sm" />}
            <HttpStatusTag showReason response={latestResponse} />
            <span>&bull;</span>
            <HttpResponseDurationTag response={latestResponse} />
            <span>&bull;</span>
            <SizeTag
              contentLength={latestResponse.contentLength ?? 0}
              contentLengthCompressed={latestResponse.contentLength}
            />
          </HStack>
        </button>
      ) : (
        <div>No Responses</div>
      )}
    </div>
  );
}

function GrpcRequestCard({ request }: { request: GrpcRequest }) {
  const latestConnection = useLatestGrpcConnection(request.id);

  return (
    <div className="grid gap-2 overflow-hidden">
      <code className="font-mono text-editor text-notice border border-notice rounded px-2.5 py-0.5 truncate w-full min-w-0">
        {request.url}
      </code>
      <div className="rounded border border-border-subtle px-2.5 py-2 text-sm">
        <div className="truncate text-text">
          {(request.service ?? "Select Service") + "/" + (request.method ?? "Select Method")}
        </div>
        <HStack space={2} alignItems="center" className="mt-1.5 whitespace-nowrap overflow-x-auto">
          {latestConnection == null ? (
            <span className="text-text-subtle">No Connections</span>
          ) : (
            <>
              <GrpcConnectionStateTag connection={latestConnection} />
              <span>&bull;</span>
              <span className="font-mono text-text-subtle">{latestConnection.elapsed}ms</span>
              {latestConnection.error ? (
                <>
                  <span>&bull;</span>
                  <span className="truncate text-danger">{latestConnection.error}</span>
                </>
              ) : null}
            </>
          )}
        </HStack>
      </div>
    </div>
  );
}

function WebsocketRequestCard({ request }: { request: WebsocketRequest }) {
  const latestConnection = useLatestWebsocketConnection(request.id);

  return (
    <div className="grid gap-2 overflow-hidden">
      <code className="font-mono text-editor text-primary border border-primary rounded px-2.5 py-0.5 truncate w-full min-w-0">
        {request.url}
      </code>
      <div className="rounded border border-border-subtle px-2.5 py-2 text-sm">
        <div className="truncate text-text">
          {request.message ? request.message.split("\n")[0] : "No initial message"}
        </div>
        <HStack space={2} alignItems="center" className="mt-1.5 whitespace-nowrap overflow-x-auto">
          {latestConnection == null ? (
            <span className="text-text-subtle">No Connections</span>
          ) : (
            <>
              <WebsocketStatusTag connection={latestConnection} />
              <span>&bull;</span>
              <span className="font-mono text-text-subtle">{latestConnection.elapsed}ms</span>
              {latestConnection.error ? (
                <>
                  <span>&bull;</span>
                  <span className="truncate text-danger">{latestConnection.error}</span>
                </>
              ) : null}
            </>
          )}
        </HStack>
      </div>
    </div>
  );
}

function useLatestWebsocketConnection(requestId: string | null) {
  const { connectionsByRequestId } = useAtomValue(websocketConnectionsByRequestIdAtom);
  return requestId == null ? null : (connectionsByRequestId.get(requestId)?.[0] ?? null);
}

function GrpcConnectionStateTag({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useLatestGrpcConnection>>;
}) {
  let label = "CONNECTED";
  let className = "text-success";

  if (connection.error) {
    label = "ERROR";
    className = "text-danger";
  } else if (connection.state === "initialized") {
    label = "CONNECTING";
    className = "text-text-subtle";
  } else if (connection.state === "closed" && connection.status !== 0) {
    label = `CLOSED ${connection.status}`;
    className = "text-warning";
  } else if (connection.state === "closed") {
    label = "CLOSED";
    className = "text-warning";
  } else if (connection.status > 0) {
    label = `OK ${connection.status}`;
  }

  return <span className={classNames("font-mono text-xs", className)}>{label}</span>;
}
