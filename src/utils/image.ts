/**
 * プロフィール画像の圧縮
 *
 * スマホで撮った写真は数 MB あるので、そのまま保存すると表示が遅く、保存先の容量も食う。
 * sharp（画像を加工するライブラリ）で縮小し、WebP という軽い形式に変換して、決めた容量以下にする。
 */
import sharp from 'sharp';

/** 画像の形式（MIME タイプ）と、ファイルの拡張子の対応表 */
const mimeToExtensionMap: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * プロフィール画像として受け付ける形式か（JPEG・PNG・GIF・WebP・HEIC）。
 * SVG や HTML は中にプログラム（スクリプト）を書けてしまい危険なので受け付けない。
 */
export const isSupportedImageType = (mimeType: string | null | undefined) =>
  Boolean(mimeType && mimeType.toLowerCase() in mimeToExtensionMap);

// 圧縮したときの出力の形式（WebP は JPEG より軽い）
const DEFAULT_OUTPUT_MIME = 'image/webp';
const DEFAULT_OUTPUT_EXTENSION = 'webp';

/** 画像の幅・高さに倍率をかける。小さくなりすぎないよう 32px より小さくはしない */
const clampDimension = (value: number | undefined, fallback: number, scale: number) => {
  if (!value || Number.isNaN(value)) {
    return Math.max(Math.round(fallback * scale), 32);
  }
  return Math.max(Math.round(value * scale), 32);
};

export type CompressOptions = {
  /** この容量（バイト）以下にする */
  maxBytes: number;
  /** 元の画像の形式（例: 'image/jpeg'） */
  mimeType?: string | null;
  /** 幅・高さの上限（px） */
  maxDimension?: number;
};

export type CompressResult = {
  /** 画像のデータ */
  buffer: Buffer;
  /** 画像の形式（例: 'image/webp'） */
  contentType: string;
  /** 保存するときの拡張子（例: 'webp'） */
  extension: string;
  /** 圧縮したか（元のままなら false） */
  wasCompressed: boolean;
  /** 元の容量（バイト） */
  originalBytes: number;
};

/** 画像の形式から拡張子を決める（'image/jpeg' → 'jpg'） */
const getExtensionFromMime = (mimeType?: string | null): string => {
  if (!mimeType) return 'bin';
  return mimeToExtensionMap[mimeType.toLowerCase()] ?? mimeType.split('/').pop() ?? 'bin';
};

/**
 * 画像を maxBytes 以下に圧縮する。
 * - もともと小さければ、何もせずそのまま返す
 * - 大きければ WebP に変換し、「大きさ（6 段階）× 画質（7 段階）」を順に下げていき、
 *   maxBytes 以下になった時点で返す
 * - どこまで下げても超えるときは、いちばん小さくできたものを返す（呼び出し側で容量を確かめる）
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
