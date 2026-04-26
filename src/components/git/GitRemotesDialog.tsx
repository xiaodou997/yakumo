import { useGit } from "@yakumo-internal/git";
import { showDialog } from "../../lib/dialog";
import { Button } from "../core/Button";
import { IconButton } from "../core/IconButton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../core/Table";
import { gitCallbacks } from "./callbacks";
import { addGitRemote } from "./showAddRemoteDialog";

interface Props {
  workspaceId: string;
  onDone: () => void;
}

export function GitRemotesDialog({ workspaceId }: Props) {
  const [{ remotes }, { rmRemote }] = useGit(workspaceId, gitCallbacks(workspaceId));

  return (
    <Table scrollable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>URL</TableHeaderCell>
          <TableHeaderCell>
            <Button
              className="text-text-subtle ml-auto"
              size="2xs"
              color="primary"
              title="Add remote"
              variant="border"
              onClick={() => addGitRemote(workspaceId)}
            >
              Add Remote
            </Button>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {remotes.data?.map((r) => (
          <TableRow key={r.name + r.url}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.url}</TableCell>
            <TableCell>
              <IconButton
                size="sm"
                className="text-text-subtle ml-auto"
                icon="trash"
                title="Remove remote"
                onClick={() => rmRemote.mutate({ name: r.name })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

GitRemotesDialog.show = (workspaceId: string) => {
  showDialog({
    id: "git-remotes",
    title: "Manage Remotes",
    size: "md",
    render: ({ hide }) => <GitRemotesDialog onDone={hide} workspaceId={workspaceId} />,
  });
};
