import { defineConfig } from "vite";
import { gui } from "@opencode/plugin/gui/vite";

// Exactly one CommonJS bundle; OpenCode Desktop loads it from npm.
// Host-provided modules are externalized by the official GUI preset.
export default defineConfig({
  plugins: [
    gui({ entry: "src/gui-experimental.mjs", outFile: "dist/gui-experimental.cjs" }),
  ],
});
