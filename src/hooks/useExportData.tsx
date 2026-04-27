import { workspacesAtom } from "@yakumo-internal/models";
import { showAlert } from "../lib/alert";
import { translate } from "../lib/i18n";
import { showDialog } from "../lib/dialog";
import { jotaiStore } from "../lib/jotai";
import { showToast } from "../lib/toast";
import { activeWorkspaceAtom } from "./useActiveWorkspace";
import { createFastMutation } from "./useFastMutation";

export const exportData = createFastMutation<void, string>({
  mutationKey: ["export_data"],
  onError: (err: string) => {
    showAlert({
      id: "export-failed",
      title: translate("export.exportData"),
      body: err,
    });
  },
  mutationFn: async () => {
    const activeWorkspace = jotaiStore.get(activeWorkspaceAtom);
    const workspaces = jotaiStore.get(workspacesAtom);

    if (activeWorkspace == null || workspaces.length === 0) return;

    const { ExportDataDialog } = await import("../components/ExportDataDialog");
    showDialog({
      id: "export-data",
      title: translate("export.exportData"),
      size: "md",
      noPadding: true,
      render: ({ hide }) => (
        <ExportDataDialog
          onHide={hide}
          onSuccess={() => {
            showToast({
              color: "success",
              message: translate("export.success"),
            });
          }}
        />
      ),
    });
  },
});

export function useExportData() {
  return exportData;
}
