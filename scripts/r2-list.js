const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('../src/generated/prisma');

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
  } catch {
    // ignore
  }
}

loadDotEnv(path.join(process.cwd(), '.env'));

const endpoint =
  process.env.R2_S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || process.env.R2_PUBLIC_URL;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.R2_REGION || process.env.AWS_REGION || 'auto';
const bucket =
  process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'office-manager-icon';

const args = new Set(process.argv.slice(2));
const shouldNormalizeDbIcons = args.has('--normalize-db-icons');
const shouldDryRun = args.has('--dry-run');

function stripKnownPrefix(value) {
  const knownPrefixes = ['user-icons/', 'uploads/', 'icons/'];
  for (const prefix of knownPrefixes) {
    const index = value.indexOf(prefix);
    if (index !== -1) {
      return value.slice(index + prefix.length);
    }
  }
  return value;
}

function normalizeDbIconValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (/^https?:\/\//.test(trimmed)) {
    try {
      candidate = decodeURIComponent(new URL(trimmed).pathname);
    } catch {
      candidate = trimmed;
    }
  }

  candidate = candidate.replace(/^\/+/, '').split('?')[0];
  candidate = stripKnownPrefix(candidate);

  return candidate || null;
}

async function listBucketObjects() {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.log('Skip R2 list: R2/S3 configuration is missing');
    return;
  }

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });

  console.log('Endpoint:', endpoint);
  console.log('Bucket:', bucket);

  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 100 }));
  if (!res.Contents || res.Contents.length === 0) {
    console.log('No objects found in bucket');
    return;
  }

  console.log('Found objects:');
  for (const obj of res.Contents) {
    console.log('-', obj.Key, obj.Size, obj.LastModified);
  }
}

async function normalizeDbIcons() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        iconFileName: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const updates = users
      .map(user => {
        const normalized = normalizeDbIconValue(user.iconFileName);
        if (!normalized || normalized === user.iconFileName) return null;
        return {
          id: user.id,
          name: user.name,
          before: user.iconFileName,
          after: normalized,
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      console.log('DB icon data is already normalized');
      return;
    }

    console.log(shouldDryRun ? 'Dry run updates:' : 'Applying updates:');
    for (const update of updates) {
      console.log(`#${update.id} ${update.name}: ${update.before} -> ${update.after}`);
    }

    if (shouldDryRun) return;

    for (const update of updates) {
      await prisma.user.update({
        where: { id: update.id },
        data: { iconFileName: update.after },
      });
    }

    console.log(`Updated ${updates.length} users`);
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  try {
    await listBucketObjects();
    if (shouldNormalizeDbIcons) {
      await normalizeDbIcons();
    }
  } catch (e) {
    console.error('Script failed:', e.message || e);
    process.exit(1);
  }
})();
