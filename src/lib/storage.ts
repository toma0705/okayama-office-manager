import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const MAX_ICON_SIZE_BYTES = 200 * 1024;

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const LOCAL_ICON_DIR_NAME = 'icons';
const LOCAL_ICON_DIR = path.join(process.cwd(), 'public', LOCAL_ICON_DIR_NAME);

const R2_S3_ENDPOINT = process.env.R2_S3_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_REGION = process.env.R2_REGION;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

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

export function normalizeStoredUserIconPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^\/+/, '').split('?')[0];
  return normalized || null;
}

export function resolveUserIconUrl(value: string | null | undefined): string | null {
  const storagePath = normalizeStoredUserIconPath(value);
  if (!storagePath) return null;
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${storagePath}`;
  return `/${LOCAL_ICON_DIR_NAME}/${storagePath}`;
}

export async function uploadUserIcon(params: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const { buffer, fileName } = params;
  const storagePath = normalizeStoredUserIconPath(fileName);

  if (!storagePath) {
    throw new Error('Invalid icon file name');
  }

  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath,
          Body: buffer,
          ContentType: params.contentType || 'application/octet-stream',
        }),
      );
    } catch (e) {
      throw new Error(`R2 upload failed: ${String(e)}`);
    }

    return {
      publicUrl: resolveUserIconUrl(storagePath) ?? storagePath,
      storagePath,
    };
  }

  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    throw new Error('R2 is not configured in production; set R2_S3_ENDPOINT and credentials.');
  }

  try {
    await fs.mkdir(LOCAL_ICON_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_ICON_DIR, storagePath), buffer);
  } catch (e) {
    throw new Error(`Failed to save icon locally: ${String(e)}`);
  }

  return {
    publicUrl: resolveUserIconUrl(storagePath) ?? storagePath,
    storagePath,
  };
}

export async function removeUserIconByUrl(value: string | null | undefined): Promise<{
  removed: boolean;
  storagePath: string | null;
  error?: Error;
}> {
  const storagePath = normalizeStoredUserIconPath(value);
  if (!storagePath) {
    return { removed: false, storagePath: null };
  }

  if (s3Client) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storagePath }));
      return { removed: true, storagePath };
    } catch (e) {
      return { removed: false, storagePath, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  try {
    await fs.unlink(path.join(LOCAL_ICON_DIR, storagePath));
    return { removed: true, storagePath };
  } catch (e) {
    return { removed: false, storagePath, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
