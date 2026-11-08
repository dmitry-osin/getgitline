import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/',import.meta.url));
const { siteBase } = JSON.parse(await readFile(new URL('../site-config.json',import.meta.url),'utf8'));
const origin = process.argv[2] || 'http://127.0.0.1:4173';
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await files(path.join(dir,entry.name),name+'/'));
    else result.push(name);
  }
  return result;
}
const outputs = await files(root);
for (const file of outputs) {
  const response = await fetch(origin+siteBase+file);
  assert.equal(response.status,200,file);
  assert((await response.arrayBuffer()).byteLength > 0 || file === '.nojekyll',file);
}
for (const locale of ['', 'en/']) assert.equal((await fetch(origin+siteBase+locale)).status,200);
assert.equal((await fetch(origin+'/en/',{redirect:'manual'})).status,404,'No root-only path');
assert.equal((await fetch(origin+siteBase+'does-not-exist',{redirect:'manual'})).status,404,'No SPA fallback');
const redirect = await fetch(origin+siteBase+'en',{redirect:'manual'});
assert.equal(redirect.status,301);
assert.equal(redirect.headers.get('location'),siteBase+'en/');
console.log(`PASS: ${outputs.length} published files return 200; direct locale URLs, 301 and genuine 404 verified under ${siteBase}.`);
