import { buildHttpGraphqlSectionProps } from "./RequestHttpGraphqlPropsAssembler";
import { RequestHttpMethodSection } from "./RequestHttpMethodSection";
import { RequestGraphqlPayloadSection } from "./RequestGraphqlPayloadSection";
import { RequestHttpConnectionSection } from "./RequestHttpConnectionSection";
import { RequestHttpAuthSection } from "./RequestHttpAuthSection";
import { RequestHttpBodySection } from "./RequestHttpBodySection";
import { RequestHttpCookieSection } from "./RequestHttpCookieSection";
import type { RequestHttpGraphqlFieldsProps } from "./RequestHttpGraphqlTypes";

export function HttpGraphqlFields({
  ...props
}: RequestHttpGraphqlFieldsProps) {
  const sections = buildHttpGraphqlSectionProps(props);

  return (
    <>
      {sections.method ? <RequestHttpMethodSection {...sections.method} /> : null}
      {sections.graphqlPayload ? (
        <RequestGraphqlPayloadSection {...sections.graphqlPayload} />
      ) : sections.body ? (
        <RequestHttpBodySection {...sections.body} />
      ) : null}
      <RequestHttpAuthSection {...sections.auth} />
      <RequestHttpCookieSection {...sections.cookies} />
      <RequestHttpConnectionSection {...sections.connection} />
    </>
  );
}
