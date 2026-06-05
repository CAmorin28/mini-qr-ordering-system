import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const DEFAULT_PORT = 3000;
const MAX_PORT_TRIES = 10;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host: "::", exclusive: true });
  });
}

async function resolvePort() {
  const envPort = process.env.PORT?.trim();
  const preferred = envPort ? Number(envPort) : DEFAULT_PORT;

  if (!Number.isFinite(preferred) || preferred < 1 || preferred > 65535) {
    console.error(`Invalid PORT value: ${envPort ?? "(empty)"}`);
    process.exit(1);
  }

  if (await isPortAvailable(preferred)) {
    return preferred;
  }

  if (envPort) {
    console.error(
      `\nPort ${preferred} is already in use.\n` +
        `Another app (or a previous dev server) is using that port.\n\n` +
        `Fix options:\n` +
        `  1. Close the other program using port ${preferred}\n` +
        `  2. Or start on a different port:  set PORT=3001 && npm run dev\n` +
        `     (PowerShell: $env:PORT=3001; npm run dev)\n`,
    );
    process.exit(1);
  }

  for (let candidate = preferred + 1; candidate <= preferred + MAX_PORT_TRIES; candidate++) {
    if (await isPortAvailable(candidate)) {
      console.warn(
        `\nPort ${preferred} is already in use — starting on port ${candidate} instead.\n` +
          `  Local:   http://localhost:${candidate}\n` +
          `  Network: check the terminal output from Next.js for your LAN IP\n\n` +
          `To use port ${preferred}, close the other process first:\n` +
          `  PowerShell: Get-NetTCPConnection -LocalPort ${preferred} | Select OwningProcess\n` +
          `  Then:       Stop-Process -Id <PID> -Force\n`,
      );
      return candidate;
    }
  }

  console.error(
    `\nNo free port found between ${preferred} and ${preferred + MAX_PORT_TRIES}.\n` +
      `Close other dev servers or set a custom port: set PORT=3010 && npm run dev\n`,
  );
  process.exit(1);
}

const port = await resolvePort();

// No --hostname: Next.js shows Local as localhost and Network as your LAN IP.
const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
