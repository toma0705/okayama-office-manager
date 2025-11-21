import sharp from 'sharp';

const mimeToExtensionMap: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const DEFAULT_OUTPUT_MIME = 'image/webp';
const DEFAULT_OUTPUT_EXTENSION = 'webp';

const clampDimension = (value: number | undefined, fallback: number, scale: number) => {
  if (!value || Number.isNaN(value)) {
    return Math.max(Math.round(fallback * scale), 32);
  }
  return Math.max(Math.round(value * scale), 32);
};

export type CompressOptions = {
  maxBytes: number;
  mimeType?: string | null;
  maxDimension?: number;
};

export type CompressResult = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  wasCompressed: boolean;
  originalBytes: number;
};

const getExtensionFromMime = (mimeType?: string | null): string => {
  if (!mimeType) return 'bin';
  return mimeToExtensionMap[mimeType.toLowerCase()] ?? mimeType.split('/').pop() ?? 'bin';
};

/**
 * プロフィールアイコンを指定バイト数以下に圧縮するユーティリティ
 * - 大きすぎる場合は WebP に変換しつつ、段階的に品質とサイズを下げる
 * - それでも超過する場合は最も小さいバッファを返す
 */
export async function compressImageToLimit(
  buffer: Buffer,
  { maxBytes, mimeType, maxDimension = 512 }: CompressOptions,
): Promise<CompressResult> {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer には Buffer を指定してください');
  }

  const originalExtension = getExtensionFromMime(mimeType);
  const originalContentType = mimeType ?? 'application/octet-stream';

  if (buffer.length <= maxBytes) {
    return {
      buffer,
      contentType: originalContentType,
      extension: originalExtension,
      wasCompressed: false,
      originalBytes: buffer.length,
    };
  }

  const dimensionScales = [1, 0.85, 0.7, 0.55, 0.4, 0.3];
  const qualityLevels = [85, 75, 65, 55, 45, 35, 25];

  let bestBuffer = buffer;
  let bestWasCompressed = false;

  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  const baseWidth = metadata.width ?? maxDimension;
  const baseHeight = metadata.height ?? maxDimension;

  for (const scale of dimensionScales) {
    const targetWidth = Math.min(clampDimension(baseWidth, maxDimension, scale), maxDimension);
    const targetHeight = Math.min(clampDimension(baseHeight, maxDimension, scale), maxDimension);

    for (const quality of qualityLevels) {
      const output = await sharp(buffer, {
        failOn: 'none',
        animated: Boolean(metadata.pages && metadata.pages > 1),
      })
        .rotate()
        .resize({
          width: targetWidth,
          height: targetHeight,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 5 })
        .toBuffer();

      if (output.length < bestBuffer.length) {
        bestBuffer = output;
        bestWasCompressed = true;
      }

      if (output.length <= maxBytes) {
        return {
          buffer: output,
          contentType: DEFAULT_OUTPUT_MIME,
          extension: DEFAULT_OUTPUT_EXTENSION,
          wasCompressed: true,
          originalBytes: buffer.length,
        };
      }
    }
  }

  if (bestWasCompressed) {
    return {
      buffer: bestBuffer,
      contentType: DEFAULT_OUTPUT_MIME,
      extension: DEFAULT_OUTPUT_EXTENSION,
      wasCompressed: true,
      originalBytes: buffer.length,
    };
  }

  return {
    buffer,
    contentType: originalContentType,
    extension: originalExtension,
    wasCompressed: false,
    originalBytes: buffer.length,
  };
}
