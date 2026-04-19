import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

function assertR2() {
  if (!env.r2Endpoint || !env.r2Bucket || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new Error("R2 is not fully configured.");
  }
}

export function hasR2() {
  return Boolean(env.r2Endpoint && env.r2Bucket && env.r2AccessKeyId && env.r2SecretAccessKey);
}

export function createR2Client() {
  assertR2();

  return new S3Client({
    region: "auto",
    endpoint: env.r2Endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey
    }
  });
}

export async function uploadBufferToR2(input: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}) {
  const client = createR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata
    })
  );

  return {
    bucket: env.r2Bucket,
    key: input.key,
    url: `${env.r2Endpoint}/${env.r2Bucket}/${input.key}`
  };
}

export async function listR2Objects(prefix: string) {
  const client = createR2Client();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: env.r2Bucket,
      Prefix: prefix
    })
  );

  return response.Contents ?? [];
}

export async function deleteR2Object(key: string) {
  const client = createR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.r2Bucket,
      Key: key
    })
  );
}
