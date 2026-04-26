import { useQuery } from "@tanstack/react-query";
import type { EditorProps } from "../components/core/Editor/Editor";
import { tryFormatHtml, tryFormatJson, tryFormatXml } from "../lib/formatters";

export function useFormatText({
  text,
  language,
  pretty,
}: {
  text: string;
  language: EditorProps["language"];
  pretty: boolean;
}) {
  return useQuery({
    placeholderData: (prev) => prev, // Keep previous data on refetch
    queryKey: [text, language, pretty],
    queryFn: async () => {
      if (text === "" || !pretty) {
        return text;
      }
      if (language === "json") {
        return tryFormatJson(text);
      }
      if (language === "html") {
        return tryFormatHtml(text);
      }
      if (language === "xml") {
        return tryFormatXml(text);
      }
      return text;
    },
  }).data;
}
