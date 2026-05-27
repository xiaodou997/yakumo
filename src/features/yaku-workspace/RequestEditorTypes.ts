import type { YakuCookieJar, YakuProtocol } from "../../lib/yaku-client";
import type { RequestConfigDraftController } from "./requestConfig";

export type RequestStructuredEditorProps = {
  protocol: YakuProtocol;
  draft: RequestConfigDraftController;
  cookieJars?: YakuCookieJar[];
};

export type RequestConfigSummaryProps = {
  protocol: YakuProtocol;
  config: Record<string, unknown>;
};
