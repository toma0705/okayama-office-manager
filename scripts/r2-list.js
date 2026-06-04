const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

function loadDotEnv(envPath) {
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    // ignore
  }
}

// try to load .env from repo root
loadDotEnv(path.join(process.cwd(), '.env'));

const endpoint =
  process.env.R2_S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || process.env.R2_PUBLIC_URL;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.R2_REGION || process.env.AWS_REGION || 'auto';
const bucket =
  process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'office-manager-icon';

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error(
    'Missing R2/S3 configuration. Please set R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY (or equivalent) in environment or .env',
  );
  process.exit(2);
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: false,
});

(async () => {
  try {
    console.log('Endpoint:', endpoint);
    console.log('Bucket:', bucket);
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: 'user-icons/', MaxKeys: 50 }),
    );
    if (!res.Contents || res.Contents.length === 0) {
      console.log('No objects found in prefix user-icons/ (or bucket is empty)');
      process.exit(0);
    }
    console.log('Found objects:');
    for (const obj of res.Contents) {
      console.log('-', obj.Key, obj.Size, obj.LastModified);
    }
  } catch (e) {
    console.error('R2 request failed:', e.message || e);
    process.exit(1);
  }
})();
