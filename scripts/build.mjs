import { execFileSync } from "node:child_process";
const run = (args) =>
  execFileSync(process.execPath, args, { stdio: "inherit", env: process.env });
run([
  "node_modules/vite/bin/vite.js",
  "build",
  "--config",
  "admin/vite.config.ts",
]);
run(["--import", "tsx", "scripts/build-public.ts"]);
console.log("Protected Telegram Studio and required public legal pages packaged.");
