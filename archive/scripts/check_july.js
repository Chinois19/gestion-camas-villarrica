import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync('./firebase_config.json', 'utf8'));
const app = initializeApp(cfg);
const db  = getFirestore(app);

const snap = await getDoc(doc(db, 'appState', 'dischargesLog'));
const log  = snap.data().data;

const inJuly = ts => { try { const d=new Date(ts); return d.getFullYear()===2026&&d.getMonth()===6; } catch{return false;}};
const bedsOnly = log.filter(r =>
  inJuly(r.cleaningAt||r.dischargeAt) &&
  !r.isWaitingListDischarge &&
  r._source !== 'migration_waitingListDischarges'
);

const byDay = {};
bedsOnly.forEach(r => {
  const d = new Date(r.cleaningAt||r.dischargeAt).toISOString().slice(0,10);
  byDay[d] = (byDay[d]||0) + 1;
});

console.log('\n📅 Distribución julio 2026 — ALTAS DESDE CAMAS (no lista espera):');
console.log('-'.repeat(45));
Object.keys(byDay).sort().forEach(d => {
  const bar = '█'.repeat(byDay[d]);
  console.log(`  ${d}:  ${String(byDay[d]).padStart(2)} ${bar}`);
});
console.log('-'.repeat(45));
console.log(`  TOTAL: ${bedsOnly.length} altas de camas reales en julio`);
console.log(`  LOG TOTAL: ${log.length} episodios`);
process.exit(0);
