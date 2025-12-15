#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const relativeSpecPath = path.join('openapi', 'openapi.yaml');
const relativeOutputPath = path.join('src', 'generated', 'openapi-client');
const outputDir = path.join(projectRoot, relativeOutputPath);

const generatorCli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const additionalProps = [
  'supportsES6=true',
  'modelPropertyNaming=camelCase',
  'withSeparateModelsAndApi=true',
  'npmName=@office-manager/api-client',
  'npmVersion=0.1.0',
  'typescriptThreePlus=true',
].join(',');

async function main() {
  await ensureDockerMode();
  await cleanupOutput();
  await runOpenApiGenerator();
  await finalizePackageJson();
  await ensureBuildArtifacts();
  console.log('✅ OpenAPI TypeScript client generated at src/generated/openapi-client');
}

async function ensureDockerMode() {
  const flag = process.env.OPENAPI_GENERATOR_USE_DOCKER;
  if (!flag || flag === 'false' || flag === '0') {
    process.env.OPENAPI_GENERATOR_USE_DOCKER = 'true';
  }
}

function isDockerEnabled() {
  return (
    process.env.OPENAPI_GENERATOR_USE_DOCKER &&
    process.env.OPENAPI_GENERATOR_USE_DOCKER !== 'false' &&
    process.env.OPENAPI_GENERATOR_USE_DOCKER !== '0'
  );
}

function resolvePathForCli(relativePath) {
  if (isDockerEnabled()) {
    return path.posix.join('/local', relativePath.replace(/\\/g, '/'));
  }

  return path.join(projectRoot, relativePath);
}

async function cleanupOutput() {
  await fs.rm(outputDir, { recursive: true, force: true });
}

async function runOpenApiGenerator() {
  const specPathForCli = resolvePathForCli(relativeSpecPath);
  const outputPathForCli = resolvePathForCli(relativeOutputPath);
  const args = [
    'openapi-generator-cli',
    'generate',
    '-g',
    'typescript-fetch',
    '-i',
    specPathForCli,
    '-o',
    outputPathForCli,
    '--additional-properties',
    additionalProps,
    '--skip-validate-spec', // 必要なら削除
  ];

  await exec(generatorCli, args, {
    cwd: projectRoot,
    env: { ...process.env, OPENAPI_GENERATOR_SKIP_INSTALL_CHECK: 'true' },
  });
}

async function finalizePackageJson() {
  const pkgPath = path.join(outputDir, 'package.json');
  const defaultPkg = {
    name: '@office-manager/api-client',
    version: '0.1.0',
    private: false,
    sideEffects: false,
    main: './dist/index.js',
    module: './dist/esm/index.js',
    types: './dist/index.d.ts',
    files: ['dist', 'README.md'],
    scripts: {
      build: 'tsc -p tsconfig.json && tsc -p tsconfig.esm.json',
      clean: 'rimraf dist',
    },
    dependencies: {
      tslib: '^2.6.2',
    },
    devDependencies: {
      typescript: '^5.3.3',
      rimraf: '^5.0.0',
    },
  };

  let pkg = defaultPkg;
  try {
    const raw = await fs.readFile(pkgPath, 'utf8');
    pkg = { ...defaultPkg, ...JSON.parse(raw) };
    pkg.files = Array.from(new Set([...(pkg.files ?? []), 'dist', 'README.md']));
    pkg.scripts = { ...defaultPkg.scripts, ...(pkg.scripts ?? {}) };
    pkg.dependencies = { ...defaultPkg.dependencies, ...(pkg.dependencies ?? {}) };
    pkg.devDependencies = { ...defaultPkg.devDependencies, ...(pkg.devDependencies ?? {}) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function ensureBuildArtifacts() {
  const npmIgnorePath = path.join(outputDir, '.npmignore');
  try {
    await fs.access(npmIgnorePath);
  } catch {
    await fs.writeFile(npmIgnorePath, 'node_modules\nnpm-debug.log\n');
  }
}

function exec(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`)),
    );
  });
}

main().catch(error => {
  console.error('❌ Failed to generate OpenAPI TypeScript client');
  console.error(error);
  process.exit(1);
});
