/**
 * ============================================================
 * GOOGLE APPS SCRIPT - BACKEND WEB APP
 * Madrasah Diniah Darul Barokah Surabaya
 * ============================================================
 *
 * CARA DEPLOY:
 * 1. Buka Google Sheets → Extensions → Apps Script
 * 2. Hapus kode default, paste seluruh kode ini
 * 3. Buat Spreadsheet dengan sheet/tab berikut:
 *    - Siswa, Nilai, MapelConfig, GuruData, KepalaData, Kelas
 * 4. Klik Deploy → New Deployment
 * 5. Type: Web App
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Copy URL, paste ke Pengaturan di aplikasi raport
 *
 * STRUKTUR KOLOM TIAP SHEET (baris 1 = header):
 *
 * Siswa:       id | nama | nis | jenjang | kelas | alamat | namaWali | waliKelas | tempatLahir | tanggalLahir | jenisKelamin | createdAt | updatedAt
 * Nilai:       id | siswaId | mapelId | mapelNama | guru | nilai | jenjang | kelas | semester | tahunAjaran | updatedAt
 * MapelConfig: id | jenjang | nama | urutan | guru | kkm
 * GuruData:    id | nama | nip | mapelAmpu | telepon | alamat
 * KepalaData:  id | nama | nip | jabatan | ttdUrl
 * Kelas:       id | nama | jenjang
 * ============================================================
 */

// ── SPREADSHEET CONFIG ────────────────────────────────────────
// Auto-detect: uses the spreadsheet that this script is bound to
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── Sheet name constants ───────────────────────────────────────
const SHEETS = {
  SISWA:  'Siswa',
  NILAI:  'Nilai',
  MAPEL:  'MapelConfig',
  GURU:   'GuruData',
  KEPALA: 'KepalaData',
  KELAS:  'Kelas',
  AKUN:   'AkunGuru',
};

// ── CORS Headers ───────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

// ── JSON Response Helper ───────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg, code = 400) {
  return jsonResponse({ error: msg, code });
}

// ── Sheet Helper: get or create sheet ─────────────────────────
function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize headers
    const headers = {
      [SHEETS.SISWA]:  ['id','nama','nis','jenjang','kelas','rombel','alamat','namaWali','waliKelas','tempatLahir','tanggalLahir','jenisKelamin','createdAt','updatedAt'],
      [SHEETS.NILAI]:  ['id','siswaId','mapelId','mapelNama','guru','nilai','jenjang','kelas','semester','tahunAjaran','updatedAt'],
      [SHEETS.MAPEL]:  ['id','jenjang','nama','urutan','kkm'],
      [SHEETS.GURU]:   ['id','nama','nip','telepon','alamat','waliKelas'],
      [SHEETS.KEPALA]: ['id','nama','nip','jabatan','ttdUrl'],
      [SHEETS.KELAS]:  ['id','nama','jenjang'],
      [SHEETS.AKUN]:   ['id','username','namaGuru','role','waliKelas','passwordHash','aktif','createdAt','updatedAt'],
    };
    const h = headers[name];
    if (h) {
      sheet.getRange(1, 1, 1, h.length).setValues([h]);
      // Style header row
      sheet.getRange(1, 1, 1, h.length)
        .setBackground('#1a5276')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ── Sheet Data Helpers ─────────────────────────────────────────
/**
 * Read all rows from a sheet, return as array of objects
 */
function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

/**
 * Find row index (1-based, including header) by id
 */
function findRowById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-based
  }
  return -1;
}

/**
 * Get headers array for a sheet
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const row   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return row.map(h => String(h).trim());
}

/**
 * Convert object to row array matching sheet headers
 */
function objectToRow(obj, headers) {
  return headers.map(h => obj[h] !== undefined ? obj[h] : '');
}

/**
 * Upsert a record: update if id exists, append if not
 */
function upsertRecord(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const row     = objectToRow(obj, headers);
  const rowIdx  = findRowById(sheetName, obj.id);

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return obj;
}

/**
 * Delete a record by id
 */
function deleteRecord(sheetName, id) {
  const rowIdx = findRowById(sheetName, id);
  if (rowIdx > 0) {
    getSheet(sheetName).deleteRow(rowIdx);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// ── ROUTER ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const action = e?.parameter?.action || 'ping';

    switch (action) {
      // ─── Health check ────
      case 'ping':
        return jsonResponse({ pong: true, ts: new Date().toISOString() });

      // ─── Siswa ──────────
      case 'getSiswa':
        return jsonResponse({ data: sheetToObjects(SHEETS.SISWA) });

      case 'getSiswaById': {
        const id = e.parameter.id;
        const all = sheetToObjects(SHEETS.SISWA);
        return jsonResponse({ data: all.find(s => s.id === id) || null });
      }

      // ─── Nilai ──────────
      case 'getNilai':
        return jsonResponse({ data: sheetToObjects(SHEETS.NILAI) });

      case 'getNilaiBySiswa': {
        const siswaId = e.parameter.siswaId;
        const all = sheetToObjects(SHEETS.NILAI);
        return jsonResponse({ data: all.filter(n => String(n.siswaId) === String(siswaId)) });
      }

      case 'getNilaiByKelas': {
        const { jenjang, kelas, semester, tahunAjaran } = e.parameter;
        let all = sheetToObjects(SHEETS.NILAI);
        if (jenjang)     all = all.filter(n => n.jenjang === jenjang);
        if (kelas)       all = all.filter(n => n.kelas === kelas);
        if (semester)    all = all.filter(n => n.semester === semester);
        if (tahunAjaran) all = all.filter(n => n.tahunAjaran === tahunAjaran);
        return jsonResponse({ data: all });
      }

      // ─── Mapel ──────────
      case 'getMapel':
        return jsonResponse({ data: sheetToObjects(SHEETS.MAPEL) });

      case 'getMapelByJenjang': {
        const jenjang = e.parameter.jenjang;
        const all = sheetToObjects(SHEETS.MAPEL);
        return jsonResponse({ data: all.filter(m => m.jenjang === jenjang) });
      }

      // ─── Guru ───────────
      case 'getGuru':
        return jsonResponse({ data: sheetToObjects(SHEETS.GURU) });

      case 'getGuruById': {
        const id = e.parameter.id;
        const all = sheetToObjects(SHEETS.GURU);
        return jsonResponse({ data: all.find(g => g.id === id) || null });
      }

      // ─── Kepala ─────────
      case 'getKepala': {
        const all = sheetToObjects(SHEETS.KEPALA);
        return jsonResponse({ data: all[0] || null });
      }

      // ─── Kelas ──────────
      case 'getKelas':
        return jsonResponse({ data: sheetToObjects(SHEETS.KELAS) });

      // ─── Akun Guru ───────
      case 'getAkun': {
        let all = sheetToObjects(SHEETS.AKUN);
        if (all.length === 0) {
          const defaultAdmin = {
            id: 'admin',
            username: 'admin',
            namaGuru: 'Administrator',
            role: 'admin',
            passwordHash: 'YWRtaW4xMjNfbWRiX3NhbHRfMjAyNA==',
            aktif: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          upsertRecord(SHEETS.AKUN, defaultAdmin);
          all = [defaultAdmin];
        }
        return jsonResponse({ data: all });
      }

      default:
        return errorResponse('Action tidak dikenal: ' + action);
    }

  } catch (err) {
    console.error('doGet error:', err);
    return errorResponse('Server error: ' + err.message, 500);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    // Parse body
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch {
      return errorResponse('Request body bukan JSON yang valid');
    }

    const action = body.action;

    switch (action) {

      // ─── Siswa ──────────────────────
      case 'saveSiswa': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID siswa diperlukan');
        if (!data.updatedAt) data.updatedAt = new Date().toISOString();
        upsertRecord(SHEETS.SISWA, data);
        return jsonResponse({ ok: true, data });
      }

      case 'saveSiswaMany': {
        const items = body.data;
        if (!Array.isArray(items)) return errorResponse('Data harus berupa array');
        items.forEach(item => {
          if (!item.updatedAt) item.updatedAt = new Date().toISOString();
          upsertRecord(SHEETS.SISWA, item);
        });
        return jsonResponse({ ok: true, count: items.length });
      }

      case 'deleteSiswa': {
        const { id } = body;
        if (!id) return errorResponse('ID diperlukan');
        const deleted = deleteRecord(SHEETS.SISWA, id);
        return jsonResponse({ ok: deleted });
      }

      // ─── Nilai ──────────────────────
      case 'saveNilai': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID nilai diperlukan');
        if (!data.updatedAt) data.updatedAt = new Date().toISOString();
        upsertRecord(SHEETS.NILAI, data);
        return jsonResponse({ ok: true, data });
      }

      case 'saveNilaiMany': {
        const items = body.data;
        if (!Array.isArray(items)) return errorResponse('Data harus berupa array');
        items.forEach(item => {
          if (!item.updatedAt) item.updatedAt = new Date().toISOString();
          upsertRecord(SHEETS.NILAI, item);
        });
        return jsonResponse({ ok: true, count: items.length });
      }

      case 'deleteNilai': {
        const { id } = body;
        if (!id) return errorResponse('ID diperlukan');
        deleteRecord(SHEETS.NILAI, id);
        return jsonResponse({ ok: true });
      }

      // ─── Mapel ──────────────────────
      case 'saveMapel': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID mapel diperlukan');
        upsertRecord(SHEETS.MAPEL, data);
        return jsonResponse({ ok: true, data });
      }

      case 'deleteMapel': {
        const { id } = body;
        deleteRecord(SHEETS.MAPEL, id);
        return jsonResponse({ ok: true });
      }

      case 'saveMapelAll': {
        const items = body.data;
        if (!Array.isArray(items)) return errorResponse('Data harus berupa array');

        // Clear existing data (except header)
        const sheet = getSheet(SHEETS.MAPEL);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

        // Write new data
        const headers = getHeaders(SHEETS.MAPEL);
        items.forEach(item => {
          sheet.appendRow(objectToRow(item, headers));
        });

        return jsonResponse({ ok: true, count: items.length });
      }

      // ─── Guru ───────────────────────
      case 'saveGuru': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID guru diperlukan');
        upsertRecord(SHEETS.GURU, data);
        return jsonResponse({ ok: true, data });
      }

      case 'deleteGuru': {
        const { id } = body;
        deleteRecord(SHEETS.GURU, id);
        return jsonResponse({ ok: true });
      }

      // ─── Kepala ─────────────────────
      case 'saveKepala': {
        const data = body.data;
        if (!data) return errorResponse('Data diperlukan');

        // Kepala is a singleton: clear and re-insert
        const sheet = getSheet(SHEETS.KEPALA);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

        if (!data.id) data.id = 'kepala_1';
        const headers = getHeaders(SHEETS.KEPALA);
        sheet.appendRow(objectToRow(data, headers));

        return jsonResponse({ ok: true, data });
      }

      // ─── Kelas ──────────────────────
      case 'saveKelas': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID kelas diperlukan');
        upsertRecord(SHEETS.KELAS, data);
        return jsonResponse({ ok: true, data });
      }

      case 'deleteKelas': {
        const { id } = body;
        deleteRecord(SHEETS.KELAS, id);
        return jsonResponse({ ok: true });
      }

      // ─── Akun Guru ──────────────────
      case 'saveAkun': {
        const data = body.data;
        if (!data?.id) return errorResponse('ID akun diperlukan');
        if (!data.updatedAt) data.updatedAt = new Date().toISOString();
        upsertRecord(SHEETS.AKUN, data);
        return jsonResponse({ ok: true, data });
      }

      case 'deleteAkun': {
        const { id } = body;
        if (!id) return errorResponse('ID diperlukan');
        if (id === 'admin') return errorResponse('Akun admin sistem tidak dapat dihapus');
        deleteRecord(SHEETS.AKUN, id);
        return jsonResponse({ ok: true });
      }

      default:
        return errorResponse('Action tidak dikenal: ' + action);
    }

  } catch (err) {
    console.error('doPost error:', err);
    return errorResponse('Server error: ' + err.message, 500);
  }
}

// ── UTILITY: One-time setup function ──────────────────────────
/**
 * Run this ONCE from the Apps Script editor to initialize all sheets.
 * Go to Run > initSheets in the editor.
 */
function initSheets() {
  Object.values(SHEETS).forEach(name => {
    getSheet(name); // Creates sheet with headers if doesn't exist
    console.log('Initialized sheet: ' + name);
  });

  // Seed default Mapel data if MapelConfig is empty
  const existing = sheetToObjects(SHEETS.MAPEL);
  if (existing.length === 0) {
    seedDefaultMapel_();
  }

  SpreadsheetApp.getUi().alert(
    '✅ Inisialisasi Berhasil!\n\n' +
    'Sheet berikut telah dibuat:\n' +
    Object.values(SHEETS).join(', ') + '\n\n' +
    'Sekarang deploy sebagai Web App.'
  );
}

function seedDefaultMapel_() {
  const defaultMapel = {
    MI:  ['Al-Quran Hadits','Aqidah Akhlak','Fiqih','SKI','Bahasa Arab','Tahfidz','Tajwid','Shorof','Nahwu'],
    MTs: ['Al-Quran Hadits','Aqidah Akhlak','Fiqih','SKI','Bahasa Arab','Tahfidz','Nahwu','Shorof','Balaaghah','Tafsir'],
    MA:  ['Al-Quran Hadits','Aqidah Akhlak','Fiqih','SKI','Bahasa Arab','Tahfidz','Nahwu','Shorof','Balaaghah','Tafsir','Hadits','Ushul Fiqih'],
  };

  function genId_() {
    return Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
  }

  const sheet = getSheet(SHEETS.MAPEL);
  const headers = getHeaders(SHEETS.MAPEL);

  Object.entries(defaultMapel).forEach(([jenjang, list]) => {
    list.forEach((nama, idx) => {
      const item = {
        id:      genId_(),
        jenjang,
        nama,
        urutan:  idx + 1,
        guru:    '',
        kkm:     70,
      };
      sheet.appendRow(objectToRow(item, headers));
    });
  });

  console.log('Default mapel seeded!');
}

// ── TEST FUNCTION (run from editor to verify) ─────────────────
function testEndpoints() {
  const ss = getSpreadsheet();
  Logger.log('Spreadsheet: ' + ss.getName());
  Logger.log('Sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));

  // Simulate a GET ping
  const pingResult = doGet({ parameter: { action: 'ping' } });
  Logger.log('Ping: ' + pingResult.getContent());

  // Simulate getSiswa
  const siswaResult = doGet({ parameter: { action: 'getSiswa' } });
  Logger.log('Siswa count: ' + JSON.parse(siswaResult.getContent()).data.length);
}
