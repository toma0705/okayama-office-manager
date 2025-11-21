import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from './supabase';

export const USER_ICON_BUCKET = 'office-manager-icon';
export const MAX_ICON_SIZE_BYTES = 200 * 1024;
const PUBLIC_PREFIX = `/storage/v1/object/public/${USER_ICON_BUCKET}/`;

const getBucket = (): ReturnType<SupabaseClient['storage']['from']> =>
  getSupabaseAdminClient().storage.from(USER_ICON_BUCKET);

export async function uploadUserIcon(params: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const { buffer, fileName, contentType } = params;
  const storagePath = `user-icons/${fileName}`;
  const bucket = getBucket();

  const { error: uploadError } = await bucket.upload(storagePath, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
  }

  const { data } = bucket.getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error('Supabase public URL を取得できませんでした');
  }

  return { publicUrl, storagePath };
}

export function extractUserIconPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const index = url.indexOf(PUBLIC_PREFIX);
  if (index === -1) {
    return null;
  }
  const rawPath = url.substring(index + PUBLIC_PREFIX.length);
  return decodeURIComponent(rawPath);
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

  const bucket = getBucket();
  const { error } = await bucket.remove([storagePath]);

  if (error) {
    return { removed: false, storagePath, error: new Error(error.message) };
  }

  return { removed: true, storagePath };
}
