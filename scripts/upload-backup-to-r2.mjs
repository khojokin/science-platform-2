import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/upload-backup-to-r2.mjs <backup-file>");
  process.exit(1);
}

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("R2 credentials are not fully configured.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const body = await fs.readFile(filePath);
const key = `backups/${path.basename(filePath)}`;

await client.send(
  new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: "application/gzip"
  })
);

console.log(JSON.stringify({ bucket: R2_BUCKET, key }, null, 2));
