import { execFileSync } from "node:child_process";
import { cp } from "node:fs/promises";
const run = (args) =>
  execFileSync(process.execPath, args, { stdio: "inherit", env: process.env });
run([
  "node_modules/vite/bin/vite.js",
  "build",
  "--config",
  "admin/vite.config.ts",
]);
run([
  "node_modules/expo/bin/cli",
  "export",
  "--platform",
  "web",
  "--output-dir",
  "mobile-dist",
]);
run(["--import", "tsx", "scripts/build-public.ts"]);
await cp("mobile-dist", "dist/app", { recursive: true });
console.log("Studio, customer app (/app/), and public legal pages packaged.");
