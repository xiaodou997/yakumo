import { Icon } from "../../components/core/Icon";
import { fieldClassName } from "./RequestFieldPrimitives";

export function RequestGrpcDiscoveryInputs({
  grpcService,
  setGrpcService,
  grpcMethod,
  setGrpcMethod,
  serviceFilter,
  setServiceFilter,
}: {
  grpcService: string;
  setGrpcService: (value: string) => void;
  grpcMethod: string;
  setGrpcMethod: (value: string) => void;
  serviceFilter: string;
  setServiceFilter: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_16rem]">
      <input
        value={grpcService}
        onChange={(event) => setGrpcService(event.target.value)}
        placeholder="package.Service"
        className={fieldClassName}
      />
      <input
        value={grpcMethod}
        onChange={(event) => setGrpcMethod(event.target.value)}
        placeholder="Method"
        className={fieldClassName}
      />
      <div className="relative">
        <Icon
          icon="search"
          size="xs"
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-subtlest"
        />
        <input
          value={serviceFilter}
          onChange={(event) => setServiceFilter(event.target.value)}
          placeholder="Filter services or methods"
          className={`${fieldClassName} pl-7`}
        />
      </div>
    </div>
  );
}
