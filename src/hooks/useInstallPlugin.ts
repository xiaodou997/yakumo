import { installPluginFromDirectory } from "@yakumo/features";
import { useFastMutation } from "./useFastMutation";

export function useInstallPlugin() {
  return useFastMutation<void, unknown, string>({
    mutationKey: ["install_plugin"],
    mutationFn: async (directory: string) => {
      await installPluginFromDirectory(directory);
    },
  });
}
