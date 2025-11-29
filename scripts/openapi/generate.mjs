#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(projectRoot, 'src', 'generated', 'openapi-client');
const configPath = path.join('openapi', 'ts-client-config.yaml');

async function main() {
  await ensureDockerModeGeneration();
  await cleanupOutput();
  await runGenerator();
  await finalizePackageJson();
  console.log('✅ OpenAPI TypeScript client regenerated at', path.relative(projectRoot, outputDir));
}

async function ensureDockerModeGeneration() {
  const envUseDocker = process.env.OPENAPI_GENERATOR_USE_DOCKER;
  if (envUseDocker && envUseDocker !== 'false' && envUseDocker !== '0') {
    return;
  }
  process.env.OPENAPI_GENERATOR_USE_DOCKER = 'true';
}

async function cleanupOutput() {
  await fs.rm(outputDir, { recursive: true, force: true });
}

async function runGenerator() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  await exec(command, ['openapi-generator-cli', 'generate', '-c', configPath], {
    cwd: projectRoot,
    env: { ...process.env, OPENAPI_GENERATOR_SKIP_INSTALL_CHECK: 'true' },
  });
}

async function finalizePackageJson() {
  const packageJsonPath = path.join(outputDir, 'package.json');
  let pkg = {};

  try {
    const raw = await fs.readFile(packageJsonPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    pkg = {};
  }

  pkg.name = '@office-manager/api-client';
  pkg.version = pkg.version ?? '0.1.0';
  pkg.private = false;
  pkg.publishConfig = { ...(pkg.publishConfig ?? {}), access: 'restricted' };
  pkg.main = pkg.main ?? './dist/index.js';
  pkg.module = pkg.module ?? './dist/esm/index.js';
  pkg.types = pkg.types ?? './dist/index.d.ts';
  pkg.sideEffects = pkg.sideEffects ?? false;

  const files = new Set(pkg.files ?? []);
  files.add('dist');
  files.add('README.md');
  pkg.files = Array.from(files);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function exec(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

main().catch(error => {
  console.error('❌ Failed to generate OpenAPI TypeScript client');
  console.error(error);
  process.exit(1);
});
