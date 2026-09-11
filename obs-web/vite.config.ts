import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { cjsInterop } from "vite-plugin-cjs-interop";

export default defineConfig({
  plugins: [
    reactRouter(),
    cjsInterop({
      dependencies: ["@fluentui/react-components"],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@fluentui/react-icons"],
  },
});
