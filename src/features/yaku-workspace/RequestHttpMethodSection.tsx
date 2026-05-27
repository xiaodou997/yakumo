import { fieldClassName } from "./RequestFieldPrimitives";
import type { RequestHttpMethodSectionProps } from "./RequestHttpGraphqlTypes";

export function RequestHttpMethodSection({
  httpMethod,
  setHttpMethod,
}: RequestHttpMethodSectionProps) {
  return (
    <input
      value={httpMethod}
      onChange={(event) => setHttpMethod(event.target.value)}
      placeholder="GET"
      className={fieldClassName}
    />
  );
}
