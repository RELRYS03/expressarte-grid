// Run in GitHub Actions after the owner saves a Cloudflare API token as a secret.
import { readFileSync, writeFileSync } from 'node:fs';

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) throw new Error('Configure CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID nos segredos do GitHub.');
const url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database`;
async function call(method, body) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Cloudflare D1: ${data.errors?.map(e => e.message).join('; ') || response.status}`);
  return data.result;
}
const databases = await call('GET');
let db = databases.find(item => item.name === 'expressarte-grid');
if (!db) db = await call('POST', { name: 'expressarte-grid' });
if (!/^[0-9a-f-]{36}$/i.test(db.uuid)) throw new Error('D1 não retornou UUID válido.');
const path = new URL('../wrangler.toml', import.meta.url);
const config = readFileSync(path, 'utf8');
writeFileSync(path, config.replace('00000000-0000-0000-0000-000000000000', db.uuid));
console.log(`D1 ${db.name} preparado (${db.uuid}).`);
