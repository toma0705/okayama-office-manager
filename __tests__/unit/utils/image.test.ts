import sharp from 'sharp';
import { compressImageToLimit } from '@/utils/image';

describe('compressImageToLimit', () => {
  it('returns original buffer when within limit', async () => {
    const buffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#ff0000' },
    })
      .png()
      .toBuffer();

    const result = await compressImageToLimit(buffer, {
      maxBytes: buffer.length + 10,
      mimeType: 'image/png',
    });

    expect(result.wasCompressed).toBe(false);
    expect(result.buffer.equals(buffer)).toBe(true);
    expect(result.contentType).toBe('image/png');
    expect(result.extension).toBe('png');
  });

  it('compresses large images under the byte limit', async () => {
    const width = 1024;
    const height = 1024;
    const channels = 3;
    const randomPixels = Buffer.alloc(width * height * channels);
    for (let i = 0; i < randomPixels.length; i += 1) {
      randomPixels[i] = Math.floor(Math.random() * 256);
    }

    const buffer = await sharp(randomPixels, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    expect(buffer.length).toBeGreaterThan(200 * 1024);

    const maxBytes = 200 * 1024;
    const result = await compressImageToLimit(buffer, {
      maxBytes,
      mimeType: 'image/png',
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.buffer.length).toBeLessThanOrEqual(maxBytes);
    expect(result.contentType).toBe('image/webp');
    expect(result.extension).toBe('webp');
  });
});
