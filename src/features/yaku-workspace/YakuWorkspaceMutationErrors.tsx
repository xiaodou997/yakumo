import { FormattedError } from "../../components/core/FormattedError";

export function YakuWorkspaceMutationErrors({ errors }: { errors: unknown[] }) {
  const error = errors.find(Boolean);
  return error ? <FormattedError>{String(error)}</FormattedError> : null;
}
