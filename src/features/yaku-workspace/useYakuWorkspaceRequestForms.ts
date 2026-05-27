import { useEffect, useState } from "react";
import type {
  YakuProtocol,
  YakuRequest,
  YakuRequestNodePageItem,
} from "../../lib/yaku-client";
import type { RequestConfigDraftController } from "./requestConfig";
import {
  useYakuWorkspaceRequestBuilderConfig,
  useYakuWorkspaceRequestEditConfig,
} from "./useYakuWorkspaceRequestConfigState";

export type RequestBuilderDraft = {
  parentId: string;
  setParentId: (value: string) => void;
  folderName: string;
  setFolderName: (value: string) => void;
  requestName: string;
  setRequestName: (value: string) => void;
  requestProtocol: YakuProtocol;
  setRequestProtocol: (value: YakuProtocol) => void;
  config: RequestConfigDraftController;
};

export type RequestEditDraft = {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  configText: string;
  setConfigText: (value: string) => void;
  config: RequestConfigDraftController;
};

export function useYakuWorkspaceRequestForms({
  selectedRequestNode,
  loadedRequest,
}: {
  selectedRequestNode:
    | (YakuRequestNodePageItem & { requestId: string })
    | null
    | undefined;
  loadedRequest: YakuRequest | null | undefined;
}) {
  const [requestName, setRequestName] = useState("New Request");
  const [requestProtocol, setRequestProtocol] = useState<YakuProtocol>("http");
  const [requestParentId, setRequestParentId] = useState("__root__");
  const [requestMoveParentId, setRequestMoveParentId] = useState("__root__");
  const [requestEditName, setRequestEditName] = useState("");
  const [requestEditDescription, setRequestEditDescription] = useState("");
  const [requestConfigText, setRequestConfigText] = useState("{}");

  const builderConfig = useYakuWorkspaceRequestBuilderConfig(requestProtocol);
  const editConfig = useYakuWorkspaceRequestEditConfig(loadedRequest);

  useEffect(() => {
    setRequestMoveParentId(selectedRequestNode?.parentId ?? "__root__");
  }, [selectedRequestNode?.parentId]);

  useEffect(() => {
    if (loadedRequest == null) {
      setRequestEditName("");
      setRequestEditDescription("");
      setRequestConfigText("{}");
      return;
    }
    setRequestEditName(loadedRequest.name);
    setRequestEditDescription(loadedRequest.description);
    setRequestConfigText(JSON.stringify(loadedRequest.config, null, 2));
  }, [loadedRequest]);

  const requestBuilderDraft: RequestBuilderDraft = {
    parentId: requestParentId,
    setParentId: setRequestParentId,
    folderName: "",
    setFolderName: () => {},
    requestName,
    setRequestName,
    requestProtocol,
    setRequestProtocol,
    config: builderConfig.controller,
  };

  const requestEditDraft: RequestEditDraft = {
    name: requestEditName,
    setName: setRequestEditName,
    description: requestEditDescription,
    setDescription: setRequestEditDescription,
    configText: requestConfigText,
    setConfigText: setRequestConfigText,
    config: editConfig.controller,
  };

  return {
    requestBuilderDraft,
    requestEditDraft,
    requestMoveParentId,
    setRequestMoveParentId,
  };
}
