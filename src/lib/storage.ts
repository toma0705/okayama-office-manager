import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const USER_ICON_BUCKET = 'office-manager-icon';
export const MAX_ICON_SIZE_BYTES = 200 * 1024;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const PUBLIC_PREFIX = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/` : null;

// S3-compatible (Cloudflare R2) client configuration
const R2_S3_ENDPOINT = process.env.R2_S3_ENDPOINT; // e.g. https://<account>.r2.dev
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const R2_REGION = process.env.R2_REGION || process.env.AWS_REGION || 'auto';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || USER_ICON_BUCKET;

const isS3Configured = Boolean(R2_S3_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
let s3Client: S3Client | null = null;
if (isS3Configured) {
  s3Client = new S3Client({
    endpoint: R2_S3_ENDPOINT,
    region: R2_REGION,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
  });
}

export async function uploadUserIcon(params: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const { buffer, fileName } = params;
  const storagePath = `user-icons/${fileName}`;
  // If S3 (R2) is configured, upload there
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath,
          Body: buffer,
          ContentType: params.contentType || 'application/octet-stream',
          ACL: 'public-read' as any,
        }),
      );
    } catch (e) {
      throw new Error(`R2 upload failed: ${String(e)}`);
    }

    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${storagePath}` : `/${storagePath}`;
    return { publicUrl, storagePath };
  }

  // Fallback: save to local public folder for development
  const publicDir = path.join(process.cwd(), 'public', 'user-icons');
  try {
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, fileName), buffer);
  } catch (e) {
    throw new Error(`Failed to save icon locally: ${String(e)}`);
  }

  const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${storagePath}` : `/${storagePath}`;
  return { publicUrl, storagePath };
}

export function extractUserIconPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (PUBLIC_PREFIX) {
    const index = url.indexOf(PUBLIC_PREFIX);
    if (index !== -1) {
      const rawPath = url.substring(index + PUBLIC_PREFIX.length).split('?')[0];
      return decodeURIComponent(rawPath);
    }
  }
  // If it's a relative path like '/user-icons/..' or 'user-icons/...'
  if (url.startsWith('/user-icons/') || url.startsWith('user-icons/')) {
    return url.replace(/^\/+/, '').split('?')[0];
  }
  return null;
}

export async function removeUserIconByUrl(url: string | null | undefined): Promise<{
  removed: boolean;
  storagePath: string | null;
  error?: Error;
}> {
  const storagePath = extractUserIconPathFromUrl(url);
  if (!storagePath) {
    return { removed: false, storagePath: null };
  }

  // If S3 (R2) is configured, delete from bucket
  if (s3Client) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storagePath }));
      return { removed: true, storagePath };
    } catch (e) {
      return { removed: false, storagePath, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  // Fallback: remove local file if exists
  const localPath = path.join(process.cwd(), 'public', storagePath);
  try {
    await fs.unlink(localPath);
    return { removed: true, storagePath };
  } catch (e) {
    return { removed: false, storagePath, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
