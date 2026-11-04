// Build with OpenCode's official V2 GUI preset, rather than copying source
// CommonJS verbatim. This catches unsupported GUI imports at publish time.
import { build } from "vite";

await build();
console.log("Built dist/gui-experimental.cjs with @opencode/plugin/gui/vite");
