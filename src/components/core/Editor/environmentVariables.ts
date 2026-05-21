export interface WrappedEnvironmentVariable {
  variable: {
    name: string;
    value: string;
    enabled?: boolean;
  };
  source: string;
}
