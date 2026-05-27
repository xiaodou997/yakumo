import { useEffect, useState } from "react";
import type { YakuEnvironment, YakuRequestNodePageItem } from "../../lib/yaku-client";

export function useYakuWorkspaceMetaForms({
  selectedEnvironment,
  selectedFolderNode,
}: {
  selectedEnvironment: YakuEnvironment | null | undefined;
  selectedFolderNode: YakuRequestNodePageItem | null | undefined;
}) {
  const [workspaceName, setWorkspaceName] = useState("New Workspace");
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentVariablesText, setEnvironmentVariablesText] = useState("{}");
  const [cookieJarName, setCookieJarName] = useState("Default");
  const [folderName, setFolderName] = useState("New Folder");
  const [folderEditName, setFolderEditName] = useState("");
  const [folderMoveParentId, setFolderMoveParentId] = useState("__root__");

  useEffect(() => {
    setFolderMoveParentId(selectedFolderNode?.parentId ?? "__root__");
  }, [selectedFolderNode?.parentId]);

  useEffect(() => {
    setFolderEditName(selectedFolderNode?.name ?? "");
  }, [selectedFolderNode?.name]);

  useEffect(() => {
    setEnvironmentName(selectedEnvironment?.name ?? "New Environment");
    setEnvironmentVariablesText(
      JSON.stringify(selectedEnvironment?.variables ?? {}, null, 2),
    );
  }, [selectedEnvironment]);

  return {
    workspaceName,
    setWorkspaceName,
    environmentName,
    setEnvironmentName,
    environmentVariablesText,
    setEnvironmentVariablesText,
    cookieJarName,
    setCookieJarName,
    folderName,
    setFolderName,
    folderEditName,
    setFolderEditName,
    folderMoveParentId,
    setFolderMoveParentId,
  };
}
