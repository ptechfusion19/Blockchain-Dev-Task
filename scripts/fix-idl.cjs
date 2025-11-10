/**
 * fix-idl.cjs
 * Copies matching `types` entries into `accounts[].type` in the IDL when missing.
 * Run with: node scripts/fix-idl.cjs
 */
const fs = require('fs');
const path = require('path');

const idlPath = path.join(process.cwd(), 'target', 'idl', 'anchor_crud_item.json');
if (!fs.existsSync(idlPath)) {
  console.error('IDL not found at', idlPath);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
const types = Array.isArray(raw.types) ? raw.types : [];
const accounts = Array.isArray(raw.accounts) ? raw.accounts : [];

let patched = false;
const typesByName = types.reduce((acc, t) => {
  if (t && t.name) acc[t.name] = t.type || t;
  return acc;
}, {});

const newAccounts = accounts.map(acc => {
  if (!acc.type && acc.name && typesByName[acc.name]) {
    acc.type = typesByName[acc.name];
 jq '.accounts' target/idl/anchor_crud_item.json   patched = true;
  }
  return acc;
});

if (patched) {
  raw.accounts = newAccounts;
  const bak = idlPath + '.bak.' + Date.now();
  fs.copyFileSync(idlPath, bak);
  fs.writeFileSync(idlPath, JSON.stringify(raw, null, 2), 'utf8');
  console.log('Patched IDL written to', idlPath);
  console.log('Backup saved to', bak);
} else {
  console.log('No patch needed - accounts already have types (or no matching types found).');
}
