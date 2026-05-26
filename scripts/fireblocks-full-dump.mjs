#!/usr/bin/env node
/**
 * Dump complet Fireblocks : tous les vaults + balances par asset + historique tx.
 * Output : /tmp/fireblocks-dump.json + résumé console.
 *
 * Usage :
 *   FIREBLOCKS_API_KEY=... FIREBLOCKS_SECRET_KEY_PATH=... node fireblocks-full-dump.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Fireblocks } from '@fireblocks/ts-sdk';

const apiKey = process.env.FIREBLOCKS_API_KEY;
const secretPath = process.env.FIREBLOCKS_SECRET_KEY_PATH;
const basePath = process.env.FIREBLOCKS_BASE_URL ?? 'https://api.fireblocks.io/v1';

if (!apiKey || !secretPath) {
  console.error('FIREBLOCKS_API_KEY + FIREBLOCKS_SECRET_KEY_PATH required');
  process.exit(1);
}

const secretKey = readFileSync(secretPath, 'utf8');
const fb = new Fireblocks({ apiKey, secretKey, basePath });

console.log('═══════════════════════════════════════════════');
console.log('FIREBLOCKS — DUMP COMPLET');
console.log('  baseURL :', basePath);
console.log('  apiKey  :', apiKey.slice(0, 8) + '…' + apiKey.slice(-4));
console.log('═══════════════════════════════════════════════\n');

const dump = {
  fetchedAt: new Date().toISOString(),
  baseURL: basePath,
  vaultAccounts: [],
  transactions: [],
  errors: [],
};

// ─── 1. Liste TOUS les vault accounts (pagination) ──────────────
console.log('▶ Étape 1/3 — Liste des vault accounts (paginated)');
let cursor;
let pageCount = 0;
try {
  do {
    const params = { limit: 200 };
    if (cursor) params.after = cursor;
    const res = await fb.vaults.getPagedVaultAccounts(params);
    const accounts = res.data?.accounts ?? [];
    dump.vaultAccounts.push(...accounts);
    cursor = res.data?.paging?.after;
    pageCount++;
    console.log(`  page ${pageCount} : +${accounts.length} accounts (cursor=${cursor ? cursor.slice(0, 8) + '…' : 'fin'})`);
  } while (cursor);
} catch (err) {
  console.error('  ❌ vault list failed:', err?.message ?? err);
  dump.errors.push({ step: 'vault_list', error: String(err?.message ?? err) });
}

console.log(`  → ${dump.vaultAccounts.length} vault accounts trouvés au total\n`);

// ─── 2. Balances détaillées par vault (déjà incluses dans getPagedVaultAccounts) ─
console.log('▶ Étape 2/3 — Résumé balances par asset (agrégation)');
const totalByAsset = {};
let totalAssetsAcrossAllVaults = 0;
for (const v of dump.vaultAccounts) {
  const assets = v.assets ?? [];
  totalAssetsAcrossAllVaults += assets.length;
  for (const a of assets) {
    const id = a.id ?? 'UNKNOWN';
    if (!totalByAsset[id]) totalByAsset[id] = { total: 0, vaultCount: 0 };
    const num = Number(a.total ?? '0');
    if (!Number.isNaN(num)) totalByAsset[id].total += num;
    if (num > 0) totalByAsset[id].vaultCount++;
  }
}
console.log(`  → ${totalAssetsAcrossAllVaults} positions d'asset cumulées sur ${dump.vaultAccounts.length} vaults\n`);

// ─── 3. Historique transactions (paginated, last 200 par batch) ────
console.log('▶ Étape 3/3 — Historique transactions (toutes, paginated)');
let txCursor;
let txPageCount = 0;
let totalTx = 0;
try {
  do {
    const params = {
      limit: 200,
      orderBy: 'createdAt',
      sort: 'DESC',
    };
    if (txCursor) params.after = txCursor;
    const res = await fb.transactions.getTransactions(params);
    const txs = res.data ?? [];
    if (Array.isArray(txs) && txs.length > 0) {
      dump.transactions.push(...txs);
      totalTx += txs.length;
      txCursor = txs[txs.length - 1]?.lastUpdated ?? undefined;
      txPageCount++;
      console.log(`  page ${txPageCount} : +${txs.length} tx (total=${totalTx})`);
      if (txs.length < 200) break;
    } else {
      break;
    }
    // Safety : stop si > 50 pages (10k tx) — éviter boucle infinie
    if (txPageCount >= 50) {
      console.log('  ⚠ safety stop @ 50 pages — historique tronqué à 10k tx');
      break;
    }
  } while (true);
} catch (err) {
  console.error('  ❌ tx fetch failed:', err?.message ?? err);
  dump.errors.push({ step: 'tx_fetch', error: String(err?.message ?? err) });
}

console.log(`  → ${dump.transactions.length} transactions totales récupérées\n`);

// ─── Output ───────────────────────────────────────────────────
writeFileSync('/tmp/fireblocks-dump.json', JSON.stringify(dump, null, 2));
console.log('═══════════════════════════════════════════════');
console.log('DUMP TERMINÉ — /tmp/fireblocks-dump.json');
console.log('═══════════════════════════════════════════════');
console.log(`  vault accounts    : ${dump.vaultAccounts.length}`);
console.log(`  asset positions   : ${totalAssetsAcrossAllVaults}`);
console.log(`  transactions      : ${dump.transactions.length}`);
console.log(`  errors            : ${dump.errors.length}`);
console.log('');

// Top assets par valeur cumulée (top 10)
console.log('TOP ASSETS (cumul sur tous vaults) :');
const sortedAssets = Object.entries(totalByAsset)
  .sort(([, a], [, b]) => b.total - a.total)
  .slice(0, 15);
for (const [id, { total, vaultCount }] of sortedAssets) {
  if (total > 0.000001) {
    console.log(`  ${id.padEnd(15)} : ${total.toFixed(8).padStart(20)} sur ${vaultCount} vault(s)`);
  }
}

console.log('\nVAULT ACCOUNTS (top 20 par # d\'assets) :');
const sortedVaults = [...dump.vaultAccounts]
  .sort((a, b) => (b.assets?.length ?? 0) - (a.assets?.length ?? 0))
  .slice(0, 20);
for (const v of sortedVaults) {
  const name = (v.name ?? '<no name>').slice(0, 40).padEnd(40);
  const assetCount = (v.assets ?? []).length;
  console.log(`  id=${String(v.id).padStart(4)} · ${name} · ${assetCount} assets`);
}
