import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedClient: S3Client | null = null;
let cachedRegion: string | undefined;

function createS3Client(region?: string) {
  const resolvedRegion = region || process.env.S3_UPLOAD_REGION;
  if (!resolvedRegion) {
    throw new Error(
      "Missing S3_UPLOAD_REGION environment variable while creating S3 client."
    );
  }

  const accessKeyId = process.env.S3_UPLOAD_KEY;
  const secretAccessKey = process.env.S3_UPLOAD_SECRET;
  const sessionToken = process.env.S3_UPLOAD_SESSION_TOKEN;

  const credentials =
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken ? { sessionToken } : {}),
        }
      : undefined;

  return new S3Client({
    region: resolvedRegion,
    credentials,
  });
}

function getS3Client(region?: string) {
  const resolvedRegion = region || process.env.S3_UPLOAD_REGION;
  if (!cachedClient || cachedRegion !== resolvedRegion) {
    cachedClient = createS3Client(resolvedRegion);
    cachedRegion = resolvedRegion;
  }
  return cachedClient;
}

export async function getPresignedGetUrl({
  key,
  bucket,
  region,
  expiresIn = 60 * 10,
}: {
  key: string;
  bucket?: string;
  region?: string;
  expiresIn?: number;
}) {
  const resolvedBucket = bucket || process.env.S3_UPLOAD_BUCKET;
  if (!resolvedBucket) {
    throw new Error(
      "Missing S3 bucket. Provide s3Bucket in input or set S3_UPLOAD_BUCKET env."
    );
  }

  const client = getS3Client(region);
  const command = new GetObjectCommand({
    Bucket: resolvedBucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}
