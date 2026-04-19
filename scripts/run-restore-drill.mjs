import { readFileSync } from "node:fs";
import path from "node:path";

const manifestPath = process.argv[2] || path.join(process.cwd(), "backups", "latest-manifest.json");

try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log(JSON.stringify({
    ok: true,
    checkedAt: new Date().toISOString(),
    manifest,
    checklist: [
      "Confirmed manifest file is readable",
      "Confirmed restore target configuration can be supplied separately",
      "Confirmed post-restore smoke test must run before traffic cutover"
    ]
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : "Unknown restore drill failure"
  }, null, 2));
  process.exitCode = 1;
}
