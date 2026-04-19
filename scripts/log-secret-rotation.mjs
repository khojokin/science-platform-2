import crypto from "node:crypto";

const provider = process.argv[2] || "manual";
const secretName = process.argv[3] || "UNSPECIFIED_SECRET";
const value = process.argv[4] || "";

const fingerprint = value ? crypto.createHash("sha256").update(value).digest("hex").slice(0, 16) : "";
console.log(JSON.stringify({
  provider,
  secretName,
  fingerprint,
  loggedAt: new Date().toISOString()
}, null, 2));
