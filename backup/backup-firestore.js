// Backup diário do Firestore do LUELE WMS.
// Corre dentro do GitHub Actions (ver ../.github/workflows/backup.yml), lê os dados
// através da Firebase Admin SDK (que ignora as regras de segurança do Firestore — por
// isso a chave de conta de serviço usada aqui tem de ficar só em GitHub Secrets, nunca
// no código) e grava um instantâneo em JSON e em Excel dentro de ../backups/.
//
// Consultar BACKUP_SETUP.md nesta pasta para os passos de configuração (que só o
// administrador da conta Google/Firebase consegue fazer).

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT não está definido (falta o GitHub Secret). Ver BACKUP_SETUP.md.');
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT não é um JSON válido:', e.message);
    process.exit(1);
  }
}

// Converte recursivamente Timestamps do Firestore Admin SDK em strings ISO 8601, para
// que o resultado seja serializável em JSON e legível em Excel sem tratamento especial.
function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = toSerializable(value[k]);
    return out;
  }
  return value;
}

async function fetchAll(db) {
  const out = {};

  const stockSnap = await db.doc('wms/stock').get();
  out.stock = stockSnap.exists ? stockSnap.data() : null;

  const usersSnap = await db.doc('wms/users').get();
  out.users = usersSnap.exists ? usersSnap.data() : null;

  const subcollections = [
    ['history_entries', 'wms/history/entries'],
    ['sfs_records', 'wms/sfs/records'],
    ['audit_entries', 'wms/audit/entries'],
    ['inventory_counts', 'wms/inventory/counts'],
  ];
  for (const [key, colPath] of subcollections) {
    const snap = await db.collection(colPath).get();
    out[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return out;
}

function sheetFromRecords(records, columns) {
  const rows = [columns.map((c) => c.label)];
  records.forEach((r) => {
    rows.push(
      columns.map((c) => {
        const v = c.key.split('.').reduce((o, k) => (o ? o[k] : undefined), r);
        return v === undefined || v === null ? '' : v;
      })
    );
  });
  return rows;
}

function buildWorkbook(data) {
  const wb = XLSX.utils.book_new();

  // Folha 1 — stock actual, achatado a partir dos 4 armazéns.
  const stockRows = [
    ['Armazém', 'Localização', 'Código', 'Nome', 'Quantidade', 'Unidade', 'Stock Mínimo', 'Ponto Encomenda', 'Lote', 'Validade'],
  ];
  const stock = data.stock || {};
  (stock.logistica || []).forEach((c) =>
    (c.materials || []).forEach((m) =>
      stockRows.push(['Logística', c.label, m.code || '', m.name, m.qty, m.unit, m.minStock || '', m.reorderPoint || '', m.lot || '', m.expiryDate || ''])
    )
  );
  (Array.isArray(stock.vini) ? stock.vini : []).forEach((m) =>
    stockRows.push(['Vini Galpão', 'Vini Galpão', m.code || '', m.name, m.qty, m.unit, m.minStock || '', m.reorderPoint || '', m.lot || '', m.expiryDate || ''])
  );
  (Array.isArray(stock.emas) ? stock.emas : []).forEach((m) =>
    stockRows.push(['Emas', 'Zona ' + (m.zone || 'A'), m.code || '', m.name, m.qty, m.unit, m.minStock || '', m.reorderPoint || '', m.lot || '', m.expiryDate || ''])
  );
  (Array.isArray(stock.patio) ? stock.patio : []).forEach((m) =>
    stockRows.push(['Pátio', 'Pátio (Trânsito)', m.code || '', m.name, m.qty, m.unit, m.minStock || '', m.reorderPoint || '', m.lot || '', m.expiryDate || ''])
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockRows), 'Stock Actual');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      sheetFromRecords(data.history_entries || [], [
        { label: 'Data/Hora', key: 'ts' },
        { label: 'Tipo', key: 'type' },
        { label: 'Material', key: 'material' },
        { label: 'Localização', key: 'location' },
        { label: 'Armazém', key: 'warehouse' },
        { label: 'Qtd', key: 'qty' },
        { label: 'Unidade', key: 'unit' },
        { label: 'Utilizador', key: 'user' },
      ])
    ),
    'Histórico'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      sheetFromRecords(data.sfs_records || [], [
        { label: 'Nº SFS', key: 'number' },
        { label: 'Data/Hora', key: 'ts' },
        { label: 'Material', key: 'material' },
        { label: 'Qtd', key: 'qty' },
        { label: 'Origem', key: 'origem' },
        { label: 'Destino', key: 'destino' },
        { label: 'Emitido por', key: 'emitidoPor' },
      ])
    ),
    'Guias SFS'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      sheetFromRecords(data.audit_entries || [], [
        { label: 'Data/Hora', key: 'ts' },
        { label: 'Material', key: 'material' },
        { label: 'Localização', key: 'location' },
        { label: 'Utilizador', key: 'user' },
      ])
    ),
    'Auditoria'
  );

  return wb;
}

// Mantém só os últimos KEEP_DAYS dias de backups na pasta, para o repositório não
// crescer indefinidamente — quem precisar de guardar mais tempo pode descarregar os
// ficheiros antes de serem removidos, ou aumentar este número.
function pruneOldBackups(outDir, keepDays) {
  const files = fs.readdirSync(outDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.(json|xlsx)$/.test(f));
  const cutoff = Date.now() - keepDays * 86400000;
  files.forEach((f) => {
    const dateStr = f.slice(0, 10);
    const d = new Date(dateStr + 'T00:00:00Z').getTime();
    if (d < cutoff) {
      fs.unlinkSync(path.join(outDir, f));
      console.log('🗑️  Removido backup antigo:', f);
    }
  });
}

async function main() {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('📥 A ler dados do Firestore...');
  const dataRaw = await fetchAll(db);
  const data = toSerializable(dataRaw);

  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, today + '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('✅ Escrito', jsonPath);

  const wb = buildWorkbook(data);
  const xlsxPath = path.join(outDir, today + '.xlsx');
  XLSX.writeFile(wb, xlsxPath);
  console.log('✅ Escrito', xlsxPath);

  pruneOldBackups(outDir, 14);

  console.log('🎉 Backup concluído com sucesso.');
}

main().catch((e) => {
  console.error('❌ Backup falhou:', e);
  process.exit(1);
});
