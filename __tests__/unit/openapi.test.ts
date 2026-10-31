/**
 * OpenAPI の仕様（openapi/openapi.yaml）と、実装（src/app/api の route.ts）が一致しているか確かめる。
 * ルートを追加・削除したら仕様も直す。仕様を直して main に入れると、api-client が自動で作り直される。
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const API_DIR = path.join(process.cwd(), 'src/app/api');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

const findRouteFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(fullPath);
    return entry.name === 'route.ts' ? [fullPath] : [];
  });

/** src/app/api/users/[id]/arrive/route.ts の POST → "POST /users/{id}/arrive" */
const implemented = findRouteFiles(API_DIR)
  .flatMap(file => {
    const apiPath = path
      .relative(API_DIR, path.dirname(file))
      .split(path.sep)
      .map(segment => segment.replace(/^\[(.+)\]$/, '{$1}'))
      .join('/');
    const source = fs.readFileSync(file, 'utf8');
    return METHODS.filter(method =>
      new RegExp(`export (const|async function) ${method}\\b`).test(source),
    ).map(method => `${method} /${apiPath}`);
  })
  .sort();

const spec = parse(fs.readFileSync(path.join(process.cwd(), 'openapi/openapi.yaml'), 'utf8'));
const documented = Object.entries(spec.paths as Record<string, Record<string, unknown>>)
  .flatMap(([apiPath, operations]) =>
    Object.keys(operations)
      .filter(key => METHODS.includes(key.toUpperCase()))
      .map(method => `${method.toUpperCase()} ${apiPath}`),
  )
  .sort();

describe('OpenAPI の仕様', () => {
  it('実装されているルートがすべて仕様に載っていて、仕様のルートはすべて実装されている', () => {
    expect(documented).toEqual(implemented);
  });

  it('バージョンは x.y.z の形（api-client のバージョンとタグになる）', () => {
    expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
