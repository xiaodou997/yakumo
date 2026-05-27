import { useEffect, useMemo, useState } from "react";
import type {
  YakuGrpcMethodDefinition,
  YakuGrpcServiceDefinition,
} from "../../lib/yaku-client";
import {
  filterDiscoveredServices,
  grpcMethodShape,
  streamingLabel,
} from "./RequestGrpcDiscoveryModel";
import {
  buildGrpcTemplateFromSchemaText,
  countGrpcTemplateFields,
} from "./RequestGrpcSchemaModel";

export function useGrpcDiscoverySelectionState({
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  grpcMessage,
  setGrpcMessage,
  discoveredServices,
  serviceFilter,
}: {
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  grpcMessage: string;
  setGrpcMessage: (value: string) => void;
  discoveredServices: YakuGrpcServiceDefinition[];
  serviceFilter: string;
}) {
  const [browserServiceName, setBrowserServiceName] = useState("");
  const [browserMethodName, setBrowserMethodName] = useState("");

  const filteredServices = useMemo(
    () => filterDiscoveredServices(discoveredServices, serviceFilter),
    [discoveredServices, serviceFilter],
  );

  useEffect(() => {
    if (filteredServices.length === 0) {
      setBrowserServiceName("");
      return;
    }

    setBrowserServiceName((current) => {
      if (filteredServices.some((service) => service.name === current)) {
        return current;
      }
      const currentGrpcService = grpcService.trim();
      if (
        filteredServices.some((service) => service.name === currentGrpcService)
      ) {
        return currentGrpcService;
      }
      return filteredServices[0]?.name ?? "";
    });
  }, [filteredServices, grpcService]);

  const selectedDiscoveredService =
    filteredServices.find((service) => service.name === browserServiceName) ??
    null;

  useEffect(() => {
    const methods = selectedDiscoveredService?.methods ?? [];
    if (methods.length === 0) {
      setBrowserMethodName("");
      return;
    }

    setBrowserMethodName((current) => {
      if (methods.some((method) => method.name === current)) {
        return current;
      }
      const currentGrpcMethod = grpcMethod.trim();
      if (methods.some((method) => method.name === currentGrpcMethod)) {
        return currentGrpcMethod;
      }
      return methods[0]?.name ?? "";
    });
  }, [grpcMethod, selectedDiscoveredService]);

  const selectedDiscoveredMethod =
    selectedDiscoveredService?.methods.find(
      (method) => method.name === browserMethodName,
    ) ?? null;
  const selectedMethodTemplate = useMemo(
    () =>
      selectedDiscoveredMethod == null
        ? null
        : buildGrpcTemplateFromSchemaText(selectedDiscoveredMethod.schema),
    [selectedDiscoveredMethod],
  );
  const selectedMethodTemplateText = useMemo(
    () =>
      selectedMethodTemplate == null
        ? "Unable to derive a template from this schema."
        : JSON.stringify(selectedMethodTemplate, null, 2),
    [selectedMethodTemplate],
  );
  const selectedMethodShape = selectedDiscoveredMethod
    ? (grpcMethodShape(selectedDiscoveredMethod) as "unary" | "streaming")
    : null;
  const selectedMethodTemplateFieldCount = useMemo(
    () => countGrpcTemplateFields(selectedMethodTemplate),
    [selectedMethodTemplate],
  );

  const serviceOptions = filteredServices.map((service) => ({
    label: service.name,
    value: service.name,
  }));
  const methodOptions = (selectedDiscoveredService?.methods ?? []).map(
    (method) => ({
      label: `${method.name} (${streamingLabel(method)})`,
      value: method.name,
    }),
  );
  const fallbackServiceName =
    browserServiceName || filteredServices[0]?.name || "__none__";
  const fallbackMethodValue =
    browserMethodName || methodOptions[0]?.value || "__none__";

  const selectDiscoveredService = (value: string) => {
    const nextService = discoveredServices.find((service) => service.name === value);
    if (nextService == null) {
      return;
    }
    setBrowserServiceName(nextService.name);
    setGrpcService(nextService.name);
    const nextMethod =
      nextService.methods.find((method) => method.name === grpcMethod.trim()) ??
      nextService.methods[0];
    if (nextMethod != null) {
      selectDiscoveredMethod(nextMethod.name);
    }
  };

  const selectDiscoveredMethod = (value: string) => {
    if (value === "__none__" || selectedDiscoveredService == null) {
      return;
    }
    const nextMethod = selectedDiscoveredService.methods.find(
      (method) => method.name === value,
    );
    if (nextMethod == null) {
      return;
    }
    setBrowserMethodName(nextMethod.name);
    setGrpcService(selectedDiscoveredService.name);
    setGrpcMethod(nextMethod.name);
    if (grpcMessage.trim() === "") {
      setGrpcMessage("{}");
    }
  };

  const focusService = (serviceName: string) => {
    setBrowserServiceName(serviceName);
    setGrpcService(serviceName);
  };

  const applyDiscoveredMethod = (
    service: YakuGrpcServiceDefinition,
    method: YakuGrpcMethodDefinition,
  ) => {
    setBrowserServiceName(service.name);
    setBrowserMethodName(method.name);
    setGrpcService(service.name);
    setGrpcMethod(method.name);
    if (grpcMessage.trim() === "") {
      setGrpcMessage("{}");
    }
  };

  return {
    filteredServices,
    selectedDiscoveredService,
    selectedDiscoveredMethod,
    selectedMethodTemplate,
    selectedMethodTemplateText,
    selectedMethodShape,
    selectedMethodTemplateFieldCount,
    serviceOptions,
    methodOptions,
    fallbackServiceName,
    fallbackMethodValue,
    selectDiscoveredService,
    selectDiscoveredMethod,
    focusService,
    applyDiscoveredMethod,
  };
}
