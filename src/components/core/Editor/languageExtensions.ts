import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { LanguageSupport } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import type { GraphQLSchema } from "graphql";
import type { WrappedEnvironmentVariable } from "../../../hooks/useEnvironmentVariables";
import type { EditorProps } from "./Editor";
import type { TwigCompletionOption } from "./twig/completion";

export type LanguageExtensionConfig = {
  useTemplating: boolean;
  environmentVariables: WrappedEnvironmentVariable[];
  onClickVariable: (option: WrappedEnvironmentVariable, tagValue: string, startPos: number) => void;
  onClickMissingVariable: (name: string, tagValue: string, startPos: number) => void;
  onClickPathParameter: (name: string) => void;
  completionOptions: TwigCompletionOption[];
  graphQLSchema: GraphQLSchema | null;
} & Pick<EditorProps, "language" | "autocomplete" | "hideGutter" | "lintExtension">;

const closeBracketsExtensions: Extension = [closeBrackets(), keymap.of([...closeBracketsKeymap])];

const syntaxExtensions: Record<
  string,
  null | (() => Promise<LanguageSupport>)
> = {
  graphql: null,
  json: async () => (await import("@shopify/lang-jsonc")).jsonc(),
  javascript: async () => (await import("@codemirror/lang-javascript")).javascript(),
  // HTML as XML because HTML is oddly slow
  html: async () => (await import("@codemirror/lang-xml")).xml(),
  xml: async () => (await import("@codemirror/lang-xml")).xml(),
  yaml: async () => (await import("@codemirror/lang-yaml")).yaml(),
  url: async () => (await import("./url/extension")).url(),
  pairs: async () => (await import("./pairs/extension")).pairs(),
  text: async () => (await import("./text/extension")).text(),
  timeline: async () => (await import("./timeline/extension")).timeline(),
  markdown: async () => (await import("@codemirror/lang-markdown")).markdown(),
};

const closeBracketsFor: (keyof typeof syntaxExtensions)[] = ["json", "javascript", "graphql"];

export async function getLanguageExtension({
  useTemplating,
  language = "text",
  lintExtension,
  environmentVariables,
  autocomplete,
  hideGutter,
  onClickVariable,
  onClickMissingVariable,
  onClickPathParameter,
  completionOptions,
  graphQLSchema,
}: LanguageExtensionConfig) {
  const extraExtensions: Extension[] = [];

  if (language === "url") {
    const { pathParametersPlugin } = await import("./twig/pathParameters");
    extraExtensions.push(pathParametersPlugin(onClickPathParameter));
  }

  // Only close brackets on languages that need it
  if (language && closeBracketsFor.includes(language)) {
    extraExtensions.push(closeBracketsExtensions);
  }

  // GraphQL is a special exception
  if (language === "graphql") {
    const [
      { graphql },
      { activeRequestIdAtom },
      { jotaiStore },
      { renderMarkdown },
      { showGraphQLDocExplorerAtom },
    ] = await Promise.all([
      import("cm6-graphql"),
      import("../../../hooks/useActiveRequestId"),
      import("../../../lib/jotai"),
      import("../../../lib/markdown"),
      import("../../graphql/graphqlAtoms"),
    ]);

    return [
      graphql(graphQLSchema ?? undefined, {
        async onCompletionInfoRender(gqlCompletionItem): Promise<Node | null> {
          if (!gqlCompletionItem.documentation) return null;
          const innerHTML = await renderMarkdown(gqlCompletionItem.documentation);
          const span = document.createElement("span");
          span.innerHTML = innerHTML;
          return span;
        },
        onShowInDocs(field, type, parentType) {
          const activeRequestId = jotaiStore.get(activeRequestIdAtom);
          if (activeRequestId == null) return;
          jotaiStore.set(showGraphQLDocExplorerAtom, (v) => ({
            ...v,
            [activeRequestId]: { field, type, parentType },
          }));
        },
      }),
      extraExtensions,
    ];
  }

  if (language === "json") {
    const { jsoncLanguage } = await import("@shopify/lang-jsonc");
    const { jsonParseLinter } = await import("./json-lint");
    extraExtensions.push(lintExtension ?? linter(jsonParseLinter()));
    extraExtensions.push(
      jsoncLanguage.data.of({
        commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
      }),
    );
    if (!hideGutter) {
      extraExtensions.push(lintGutter());
    }
  }

  const maybeBase = language ? (syntaxExtensions[language] ?? syntaxExtensions.text) : null;
  const base = typeof maybeBase === "function" ? await maybeBase() : null;
  if (base == null) {
    return [];
  }

  if (!useTemplating) {
    return [base, extraExtensions];
  }

  const [{ twig }, { parser: twigParser }] = await Promise.all([
    import("./twig/extension"),
    import("./twig/twig"),
  ]);
  return twig({
    base,
    twigParser,
    environmentVariables,
    completionOptions,
    autocomplete,
    onClickVariable,
    onClickMissingVariable,
    onClickPathParameter,
    extraExtensions,
  });
}
