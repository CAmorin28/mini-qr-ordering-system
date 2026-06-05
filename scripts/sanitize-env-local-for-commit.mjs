import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ENV_FILE = ".env.local";
const BACKUP_FILE = ".env.local.pre-commit.bak";

function isStaged(file) {
  const staged = execSync("git diff --cached --name-only", { encoding: "utf8" });
  return staged.split(/\r?\n/).some((name) => name.trim() === file);
}

function sanitize(content) {
  return content.replace(/^MYSQL_PASSWORD=.*$/m, "MYSQL_PASSWORD=");
}

if (!isStaged(ENV_FILE) || !existsSync(ENV_FILE)) {
  process.exit(0);
}

const original = readFileSync(ENV_FILE, "utf8");
const cleaned = sanitize(original);

if (original === cleaned) {
  process.exit(0);
}

writeFileSync(BACKUP_FILE, original, "utf8");
writeFileSync(ENV_FILE, cleaned, "utf8");

try {
  execSync(`git add ${ENV_FILE}`, { stdio: "inherit" });
} finally {
  writeFileSync(ENV_FILE, original, "utf8");
  if (existsSync(BACKUP_FILE)) {
    unlinkSync(BACKUP_FILE);
  }
}
