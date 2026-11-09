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
  SISWA:      'Siswa',
  NILAI:      'Nilai',
  MAPEL:      'MapelConfig',
  GURU:       'User',
  KEPALA:     'KepalaData',
  KELAS:      'Kelas',
  AKUN:       'AkunGuru',
  USER:       'User',
  PENGATURAN: 'Pengaturan',
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
  if (sheet) return sheet;

  // Cek alias nama sheet umum di Google Sheets
  const aliases = {
    [SHEETS.USER]: ['User', 'Users', 'Akun', 'AkunGuru', 'Akun Guru'],
    [SHEETS.SISWA]: ['Siswa', 'DataSiswa', 'Data Siswa', 'Students'],
    [SHEETS.MAPEL]: ['Mapel', 'MataPelajaran', 'Mata Pelajaran', 'MapelConfig'],
    [SHEETS.KEPALA]: ['Kepala', 'KepalaMadrasah', 'Kepala Madrasah', 'KepalaData'],
    [SHEETS.NILAI]: ['Nilai', 'NilaiSiswa', 'DataNilai'],
    [SHEETS.KELAS]: ['Kelas', 'DataKelas'],
    [SHEETS.PENGATURAN]: ['Pengaturan', 'Settings', 'Config']
  };

  const nameList = [name].concat(aliases[name] || []);
  const allSheets = ss.getSheets();
  for (let i = 0; i < allSheets.length; i++) {
    const sName = allSheets[i].getName().trim().toLowerCase();
    for (let j = 0; j < nameList.length; j++) {
      if (sName === nameList[j].toLowerCase()) {
        return allSheets[i];
      }
    }
  }

  // Header definisi standar (lengkap dengan NISN, Rombel, Jenjang Kepala, Pengaturan)
  const defaultHeaders = {
    [SHEETS.SISWA]:      ['id','nama','nis','nisn','jenjang','kelas','rombel','alamat','namaWali','waliKelas','tempatLahir','tanggalLahir','jenisKelamin','createdAt','updatedAt'],
    [SHEETS.NILAI]:      ['id','siswaId','mapelId','mapelNama','guru','nilai','jenjang','kelas','rombel','semester','tahunAjaran','updatedAt'],
    [SHEETS.MAPEL]:      ['id','jenjang','nama','urutan','kkm','guru'],
    [SHEETS.KEPALA]:     ['id','jenjang','nama','nip','jabatan','ttdUrl','updatedAt'],
    [SHEETS.KELAS]:      ['id','nama','jenjang'],
    [SHEETS.AKUN]:       ['id','username','namaGuru','role','waliKelas','passwordHash','aktif','createdAt','updatedAt'],
    [SHEETS.USER]:       ['user','password','Nama Guru','Tugas','Status'],
    [SHEETS.PENGATURAN]: ['id','tahunAjaran','semester','tempatCetak','tanggalCetak','namaMadrasah','alamatMadrasah','updatedAt'],
  };

  if (!sheet) {
    sheet = ss.insertSheet(name);
    const h = defaultHeaders[name];
    if (h) {
      sheet.getRange(1, 1, 1, h.length).setValues([h]);
      // Style header row
      sheet.getRange(1, 1, 1, h.length)
        .setBackground('#1a5276')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);

      if (name === SHEETS.USER) {
        // Contoh awal user dan password guru
        sheet.appendRow(['admin', 'admin123', 'Administrator', 'Admin', 'Aktif']);
        sheet.appendRow(['pakguru', '123456', 'H. MUSTOFA ALI', 'Wali Kelas 1 A', 'Aktif']);
      }
      if (name === SHEETS.PENGATURAN) {
        sheet.appendRow(['config_utama', '2026/2027', 'Ganjil', 'Surabaya', '', 'MADRASAH DINIAH DARUL BAROKAH', 'JATIPURWO IV/14A SURABAYA', new Date().toISOString()]);
      }
    }
  } else {
    // Sinkronisasi otomatis kolom header jika ada kolom baru yang belum ada di spreadsheet
    syncSheetHeaders_(sheet, defaultHeaders[name]);
  }
  return sheet;
}

/**
 * Otomatis menambahkan kolom header baru yang belum ada di spreadsheet tanpa merusak data lama
 */
function syncSheetHeaders_(sheet, requiredHeaders) {
  if (!sheet || !requiredHeaders || requiredHeaders.length === 0) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.getRange(1, 1, 1, requiredHeaders.length)
      .setBackground('#1a5276')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const existingLower = existingHeaders.map(h => h.toLowerCase());

  const missing = [];
  requiredHeaders.forEach(req => {
    if (!existingLower.includes(req.toLowerCase())) {
      missing.push(req);
    }
  });

  if (missing.length > 0) {
    const startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    sheet.getRange(1, startCol, 1, missing.length)
      .setBackground('#1a5276')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }
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
  return data.slice(1).map((row, rowIdx) => {
    const obj = {};
    headers.forEach((h, i) => { 
      const val = row[i] ?? '';
      obj[h] = val;
      const lowerH = h.toLowerCase();
      if (lowerH === 'nisn' && obj.nisn === undefined) obj.nisn = String(val).trim();
      if (lowerH === 'nis' && obj.nis === undefined) obj.nis = String(val).trim();
      if (lowerH === 'nama' && obj.nama === undefined) obj.nama = String(val).trim();
      if (lowerH === 'jenjang' && obj.jenjang === undefined) obj.jenjang = String(val).trim().toUpperCase();
      if (lowerH === 'kelas' && obj.kelas === undefined) obj.kelas = String(val).trim();
      if (lowerH === 'rombel' && obj.rombel === undefined) obj.rombel = String(val).trim().toUpperCase();
    });

    if (sheetName === SHEETS.SISWA) {
      // Auto-koreksi jenjang jika di spreadsheet terisi 'MI' untuk tingkatan kelas 7-9 (MTs) atau 10-12 (MA)
      var rawK = obj.kelas || '';
      var numK = parseInt(String(rawK).replace(/[^0-9]/g, ''), 10);
      if (numK >= 7 && numK <= 9) {
        obj.jenjang = 'MTs';
      } else if (numK >= 10 && numK <= 12) {
        obj.jenjang = 'MA';
      } else if (numK >= 1 && numK <= 6) {
        obj.jenjang = 'MI';
      }
    }

    if (!obj.id) {
      if (sheetName === SHEETS.SISWA) {
        obj.id = obj.nis ? 's_' + obj.nis : 's_' + (rowIdx + 1);
      } else if (sheetName === SHEETS.KEPALA) {
        obj.id = 'kepala_' + (obj.jenjang || 'MI');
      } else {
        obj.id = 'rec_' + (rowIdx + 1);
      }
    }

    return obj;
  });
}

/**
 * Find row index (1-based, including header) by id or smart attributes (nis/username)
 */
function findRowById(sheetName, id, obj = null) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idCol = headers.indexOf('id');
  const nisCol = headers.indexOf('nis');

  for (let i = 1; i < data.length; i++) {
    if (idCol >= 0 && String(data[i][idCol]).trim() === String(id).trim()) {
      return i + 1;
    }
    if (idCol < 0 && String(data[i][0]).trim() === String(id).trim()) {
      return i + 1;
    }
    if (obj && obj.nis && nisCol >= 0 && String(data[i][nisCol]).trim() === String(obj.nis).trim()) {
      return i + 1;
    }
  }
  return -1;
}

/**
 * Get headers array for a sheet
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  const row   = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return row.map(h => String(h).trim());
}

/**
 * Convert object to row array matching sheet headers (case-insensitive & alias-aware)
 */
function objectToRow(obj, headers) {
  return headers.map(h => {
    if (obj[h] !== undefined && obj[h] !== null) return obj[h];
    const lowerH = String(h).trim().toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerH && obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    if (lowerH === 'nisn') return obj.nisn || obj.NISN || '';
    if (lowerH === 'nis') return obj.nis || obj.NIS || '';
    if (lowerH === 'nama') return obj.nama || obj.namaSiswa || obj['Nama Siswa'] || '';
    if (lowerH === 'rombel') return obj.rombel || obj.Rombel || '';
    if (lowerH === 'jenjang') return obj.jenjang || obj.Jenjang || '';
    if (lowerH === 'kelas') return obj.kelas || obj.Kelas || '';
    return '';
  });
}

/**
 * Upsert a record: update if id exists, append if not
 */
function upsertRecord(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const rowIdx  = findRowById(sheetName, obj.id, obj);
  const row     = objectToRow(obj, headers);

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    const idCol = headers.map(h => h.toLowerCase()).indexOf('id');
    if (idCol >= 0 && !obj.id) {
      obj.id = (obj.nis ? 's_' + obj.nis : (typeof genId_ === 'function' ? genId_() : Utilities.getUuid().substring(0, 8)));
      row[idCol] = obj.id;
    }
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

/**
 * Parse teks tugas menjadi nilai wali kelas sederhana (misal 'Wali Kelas 1 A' -> '1 A')
 */
function parseTugasToWaliKelas_(tugas) {
  if (!tugas) return '';
  var str = String(tugas).trim();
  var clean = str.replace(/^(guru\s*kelas|guru\s*kls|wali\s*kelas|wali\s*kls|guru|wali|kelas|kls)\s*/i, '').trim();
  return clean || str;
}

/**
 * Baca semua baris dari sheet 'User' (atau 'user')
 */
function getUsersFromSheet_() {
  var userSheet = getSheet(SHEETS.USER);
  var rawRows = sheetToObjects(userSheet.getName());
  if (!rawRows || rawRows.length === 0) return [];

  return rawRows.map(function(r, idx) {
    var user = String(r.user || r.User || r.username || r.Username || r.id || '').trim();
    var pass = String(r.password || r.Password || '').trim();
    var nama = String(r['Nama Guru'] || r.namaGuru || r.nama || r.Nama || user).trim();
    var tugas = String(r.Tugas || r.tugas || r.waliKelas || r.mapelAmpu || '').trim();
    var rawStat = String(r.Status || r.status || 'Aktif').trim();
    var aktif = (rawStat.toLowerCase() === 'aktif' || rawStat === '1' || rawStat.toLowerCase() === 'active');
    var role = (user.toLowerCase() === 'admin') ? 'admin' : (r.role || 'guru');
    var waliKelas = parseTugasToWaliKelas_(tugas);

    return {
      id: user || ('USR_' + idx),
      username: user,
      user: user,
      password: pass,
      namaGuru: nama,
      nama: nama,
      tugas: tugas,
      mapelAmpu: tugas,
      waliKelas: waliKelas,
      nip: String(r.nip || r.NIP || '').trim(),
      telepon: String(r.telepon || r.Telepon || '').trim(),
      alamat: String(r.alamat || r.Alamat || '').trim(),
      role: role,
      status: rawStat,
      aktif: aktif
    };
  }).filter(function(u) { return (u.username && u.username.length > 0) || (u.nama && u.nama.length > 0); });
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
        const { jenjang, kelas, rombel, semester, tahunAjaran } = e.parameter;
        let all = sheetToObjects(SHEETS.NILAI);
        if (jenjang)     all = all.filter(n => n.jenjang === jenjang);
        if (kelas)       all = all.filter(n => String(n.kelas).trim() === String(kelas).trim());
        if (rombel)      all = all.filter(n => !n.rombel || String(n.rombel).trim().toUpperCase() === String(rombel).trim().toUpperCase());
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

      // ─── Guru (diambil langsung 100% dari sheet User) ───────────
      case 'getGuru': {
        const users = getUsersFromSheet_();
        const guruList = users.map(function(u) {
          return {
            id: u.username || u.id,
            nama: u.namaGuru || u.username,
            waliKelas: u.waliKelas || u.tugas,
            mapelAmpu: u.mapelAmpu || u.tugas,
            tugas: u.tugas || '',
            nip: u.nip || '',
            telepon: u.telepon || '',
            alamat: u.alamat || ''
          };
        });
        return jsonResponse({ data: guruList });
      }

      case 'getGuruById': {
        const id = e.parameter.id;
        const users = getUsersFromSheet_();
        const found = users.find(function(u) {
          return u.id === id || u.username === id || (u.nama && u.nama.toLowerCase() === String(id).toLowerCase());
        });
        if (found) {
          return jsonResponse({
            data: {
              id: found.username || found.id,
              nama: found.namaGuru,
              waliKelas: found.waliKelas,
              mapelAmpu: found.mapelAmpu,
              tugas: found.tugas,
              nip: found.nip || '',
              telepon: found.telepon || '',
              alamat: found.alamat || ''
            }
          });
        }
        return jsonResponse({ data: null });
      }

      // ─── Kepala ─────────
      case 'getKepala': {
        const all = sheetToObjects(SHEETS.KEPALA);
        const j = (body?.jenjang || e?.parameter?.jenjang || '').toUpperCase();
        if (j) {
          const match = all.find(k => String(k.jenjang || '').toUpperCase() === j || String(k.id || '').toUpperCase() === 'KEPALA_' + j);
          return jsonResponse({ data: match || all[0] || null, list: all });
        }
        return jsonResponse({ data: all[0] || null, list: all });
      }

      // ─── Kelas ──────────
      case 'getKelas':
        return jsonResponse({ data: sheetToObjects(SHEETS.KELAS) });

      // ─── Akun Guru / User ───────
      case 'getUser':
      case 'getAkun': {
        const users = getUsersFromSheet_();
        if (users && users.length > 0) {
          return jsonResponse({ data: users });
        }
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

      // ─── Pengaturan ────
      case 'getPengaturan': {
        const all = sheetToObjects(SHEETS.PENGATURAN);
        return jsonResponse({ data: all[0] || null });
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

      // ─── Guru (disimpan langsung ke sheet User) ───────
      case 'saveGuru': {
        const data = body.data;
        if (!data) return errorResponse('Data guru diperlukan');
        const userObj = {
          user: data.username || data.user || data.id || data.nama,
          password: data.password || '123',
          'Nama Guru': data.nama || data.namaGuru || '',
          Tugas: data.mapelAmpu || data.tugas || data.waliKelas || '',
          Status: data.status || 'Aktif'
        };
        upsertRecord(SHEETS.USER, userObj);
        return jsonResponse({ ok: true, data: userObj });
      }

      case 'deleteGuru': {
        const { id } = body;
        deleteRecord(SHEETS.USER, id);
        return jsonResponse({ ok: true });
      }

      // ─── Kepala ─────────────────────
      case 'saveKepala': {
        const data = body.data;
        if (!data) return errorResponse('Data diperlukan');

        const jenjang = String(data.jenjang || 'MI').toUpperCase();
        if (!data.id) data.id = 'kepala_' + jenjang;
        data.jenjang = jenjang;

        // Upsert record berdasarkan ID (kepala_MI, kepala_MTs, kepala_MA)
        upsertRecord(SHEETS.KEPALA, data);

        const all = sheetToObjects(SHEETS.KEPALA);
        return jsonResponse({ ok: true, data, list: all });
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

      // ─── User (Sheet User) ──────────
      case 'saveUser': {
        const data = body.data;
        if (!data) return errorResponse('Data user diperlukan');
        const userSheet = getSheet(SHEETS.USER);
        const userVal   = data.user || data.username || data.id;
        const passVal   = data.password || '';
        const namaVal   = data['Nama Guru'] || data.namaGuru || data.nama || userVal;
        const tugasVal  = data.Tugas || data.tugas || data.waliKelas || '';
        const statusVal = data.Status || data.status || 'Aktif';

        const rowIdx = findRowById(SHEETS.USER, userVal);
        if (rowIdx > 0) {
          userSheet.getRange(rowIdx, 1, 1, 5).setValues([[userVal, passVal, namaVal, tugasVal, statusVal]]);
        } else {
          userSheet.appendRow([userVal, passVal, namaVal, tugasVal, statusVal]);
        }
        return jsonResponse({ ok: true, data });
      }

      case 'deleteUser': {
        const { id } = body;
        if (!id) return errorResponse('ID user diperlukan');
        if (id === 'admin') return errorResponse('Akun admin tidak dapat dihapus');
        deleteRecord(SHEETS.USER, id);
        return jsonResponse({ ok: true });
      }

      // ─── Pengaturan ─────────────────
      case 'savePengaturan': {
        const data = body.data;
        if (!data) return errorResponse('Data diperlukan');
        data.id = data.id || 'config_utama';
        data.updatedAt = new Date().toISOString();
        upsertRecord(SHEETS.PENGATURAN, data);
        return jsonResponse({ ok: true, data });
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

  // Seed default Pengaturan if empty
  const existingConfig = sheetToObjects(SHEETS.PENGATURAN);
  if (existingConfig.length === 0) {
    upsertRecord(SHEETS.PENGATURAN, {
      id: 'config_utama',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      tempatCetak: 'Surabaya',
      tanggalCetak: '',
      namaMadrasah: 'MADRASAH DINIAH DARUL BAROKAH',
      alamatMadrasah: 'JATIPURWO IV/14A SURABAYA',
      updatedAt: new Date().toISOString()
    });
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
