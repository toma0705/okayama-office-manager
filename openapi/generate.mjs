#!/usr/bin/env node
/**
 * openapi/openapi.yaml から TypeScript の API クライアント（office-manager-api-client）を生成する。
 *
 *   npm run openapi:generate                   … 隣のフォルダ ../api-client に出力する
 *   npm run openapi:generate -- --out <フォルダ> … 出力先を指定する（GitHub Actions で使う）
 *
 * Java が必要。生成器のバージョンは openapitools.json で固定している。
 * パッケージのバージョンは仕様の info.version を使う。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(webRoot, 'openapi', 'openapi.yaml');

const outIndex = process.argv.indexOf('--out');
const outputPath = path.resolve(
  outIndex >= 0 ? process.argv[outIndex + 1] : path.join(webRoot, '..', 'api-client'),
);

const PACKAGE_NAME = '@office-manager/api-client';
const REPOSITORY_URL = 'https://github.com/toma0705/office-manager-api-client.git';

async function main() {
  const spec = parse(await fs.readFile(specPath, 'utf8'));
  const version = spec.info.version;

  // 仕様から消えた型やエンドポイントのファイルが残らないよう、生成物を消してから作る
  await fs.rm(path.join(outputPath, 'src'), { recursive: true, force: true });
  await fs.rm(path.join(outputPath, 'docs'), { recursive: true, force: true });

  await run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      'openapi-generator-cli',
      'generate',
      '-g',
      'typescript-fetch',
      '-i',
      specPath,
      '-o',
      outputPath,
      '--additional-properties',
      [
        'supportsES6=true',
        'modelPropertyNaming=camelCase',
        'withSeparateModelsAndApi=true',
        `npmName=${PACKAGE_NAME}`,
        `npmVersion=${version}`,
        'typescriptThreePlus=true',
      ].join(','),
    ],
    // openapitools.json（生成器のバージョン）を読ませるため、web のフォルダで実行する
    { cwd: webRoot },
  );

  await fixPackageJson();
  console.log(`✅ ${PACKAGE_NAME}@${version} を ${outputPath} に生成しました`);
}

/** 生成された package.json の説明やリポジトリを、このプロジェクトのものにする */
async function fixPackageJson() {
  const pkgPath = path.join(outputPath, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
  pkg.description = '入退室管理アプリの API クライアント（web/openapi/openapi.yaml から自動生成）';
  pkg.author = 'toma0705';
  pkg.repository = { type: 'git', url: REPOSITORY_URL };
  await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} が失敗しました`)),
    );
  });
}

main().catch(error => {
  console.error('❌ API クライアントの生成に失敗しました');
  console.error(error);
  process.exit(1);
});
