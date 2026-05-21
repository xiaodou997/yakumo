import type { ReactNode } from "react";
import { appInfo } from "../lib/appInfo";

interface Props {
  children: ReactNode;
  feature: "updater";
}

const featureMap: Record<Props["feature"], boolean> = {
  updater: appInfo.featureUpdater,
};

export function CargoFeature({ children, feature }: Props) {
  if (featureMap[feature]) {
    return <>{children}</>;
  }
  return null;
}
