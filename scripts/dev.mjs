import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 3000;
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

// No --hostname: Next.js shows Local as localhost and Network as your LAN IP.
const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
