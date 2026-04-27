// @ts-ignore
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import svgr from "vite-plugin-svgr";

const require = createRequire(import.meta.url);
const cMapsDir = normalizePath(
  path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "cmaps"),
);
const standardFontsDir = normalizePath(
  path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts"),
);

function packageNameFromId(id: string): string | null {
  const normalizedId = normalizePath(id);
  const nodeModulesIndex = normalizedId.lastIndexOf("/node_modules/");
  if (nodeModulesIndex < 0) {
    return null;
  }

  const packagePath = normalizedId.slice(nodeModulesIndex + "/node_modules/".length);
  const [scopeOrName, name] = packagePath.split("/");
  if (scopeOrName == null) {
    return null;
  }

  return scopeOrName.startsWith("@") && name != null ? `${scopeOrName}/${name}` : scopeOrName;
}

function manualChunks(id: string): string | undefined {
  const packageName = packageNameFromId(id);
  if (packageName == null) {
    return undefined;
  }

  if (packageName === "react" || packageName === "react-dom" || packageName === "scheduler") {
    return "vendor-react";
  }

  if (packageName === "graphql") {
    return "graphql";
  }

  if (packageName === "react-pdf" || packageName === "pdfjs-dist") {
    return "pdf";
  }

  if (packageName === "motion" || packageName === "framer-motion") {
    return "motion";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./routes",
      generatedRouteTree: "./routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    svgr(),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    viteStaticCopy({
      targets: [
        { src: cMapsDir, dest: "" },
        { src: standardFontsDir, dest: "" },
      ],
    }),
  ],
  build: {
    sourcemap: process.env.YAKUMO_BUILD_SOURCEMAP === "true",
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Make chunk names readable
        manualChunks,
        chunkFileNames: "assets/chunk-[name]-[hash].js",
        entryFileNames: "assets/entry-[name]-[hash].js",
        assetFileNames: "assets/asset-[name]-[hash][extname]",
      },
    },
  },
  define: {
    "process.version": JSON.stringify("v20.0.0"),
  },
  clearScreen: false,
  server: {
    port: parseInt(process.env.YAKUMO_DEV_PORT ?? "1420", 10),
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
