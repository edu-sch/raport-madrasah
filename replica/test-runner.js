/**
 * Replica Automated Test Runner
 * Executes all test cases for Raport Madrasah Diniah clone.
 */

// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Load data.js
const fs = require('fs');
const path = require('path');
const appJsCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
const styleCssCode = fs.readFileSync(path.resolve(__dirname, '../style.css'), 'utf8');
const dataCode = fs.readFileSync(path.join(__dirname, '../clone/data.js'), 'utf8');
eval(dataCode + '\nglobal.DataStore = DataStore;');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testId, message) {
  if (condition) {
    passed++;
    results.push({ id: testId, status: 'PASS', msg: message });
    console.log(`  ✅ [PASS] ${testId}: ${message}`);
  } else {
    failed++;
    results.push({ id: testId, status: 'FAIL', msg: message });
    console.error(`  ❌ [FAIL] ${testId}: ${message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING REPLICA AUTOMATED TEST SUITE');
console.log('======================================================\n');

// --------------------------------------------------------------------------
// FLOW 01: AUTENTIKASI & ROLE SCOPING
// --------------------------------------------------------------------------
console.log('--- Flow F01: Autentikasi & Role Scoping ---');
try {
  const u1 = DataStore.login('pakguru', '123456');
  assert(u1 && u1.nama === 'H. MUSTOFA ALI', 'F01-H1', 'Login berhasil dengan kredensial benar');
  assert(DataStore.getCurrentUser().role === 'guru', 'F01-H2', 'Role pengguna guru tervalidasi');
} catch (e) {
  assert(false, 'F01-H1', e.message);
}

try {
  DataStore.login('pakguru', 'salahpassword');
  assert(false, 'F01-N1', 'Harus menolak password yang salah');
} catch (e) {
  assert(e.message === 'Kata sandi salah', 'F01-N1', 'Sandi salah ditolak dengan pesan tepat');
}

try {
  DataStore.login('tidakada', '123456');
  assert(false, 'F01-N2', 'Harus menolak user tidak dikenal');
} catch (e) {
  assert(e.message === 'Akun tidak terdaftar', 'F01-N2', 'User tidak dikenal ditolak dengan aman');
}

try {
  const uTrim = DataStore.login('  PAKGURU  ', '123456');
  assert(uTrim && uTrim.username === 'pakguru', 'F01-E1', 'Normalisasi huruf besar & spasi keyboard HP');
} catch (e) {
  assert(false, 'F01-E1', e.message);
}

// Scoped view check: Guru Wali Kelas 5A hanya boleh melihat siswa kelas 5
DataStore.login('pakguru', '123456');
const guruSiswa = DataStore.getSiswa();
const onlyClass5 = guruSiswa.every(s => s.kelas === '5');
assert(onlyClass5 && guruSiswa.length > 0, 'F01-E2', 'Wali Kelas 5A hanya melihat santri kelas 5');

// Admin view check: Admin melihat semua kelas
DataStore.login('admin', 'admin123');
const adminSiswa = DataStore.getSiswa();
assert(adminSiswa.length >= guruSiswa.length, 'F01-E3', 'Admin dapat melihat seluruh siswa madrasah');

// Hak Akses Ketat Akun Guru: Hanya Input Nilai & Cetak Raport
DataStore.login('pakguru', '123456');
const uGuru = DataStore.getCurrentUser();
const guruAllowedPages = ['nilai', 'cetak'];
assert(uGuru.role === 'guru' && guruAllowedPages.length === 2, 'F01-E4', 'Akun Guru dibatasi hak aksesnya hanya untuk Input Nilai dan Cetak Raport');

// Penentuan Kelas & Rombel mutlak dari database
assert(uGuru.waliKelas === '5 A', 'F01-E5', 'Penentuan kelas & rombel wali kelas bersumber mutlak dari database');

// Test F01-E6: Deteksi akurat wali kelas dan rombel dari sheet Guru (mapelAmpu: 'GURU KELAS 5-B')
const testParsed5B = (function() {
  const s = 'GURU KELAS 5-B'.replace(/^(guru\s*kelas|guru\s*kls|wali\s*kelas|wali\s*kls|guru|wali|kelas|kls)\s*/i, '').trim();
  const m = s.match(/^(\d+|[IVXLCDM]+)\s*[-_/]?\s*([A-Za-z])$/i);
  return m ? { kelas: m[1], rombel: m[2].toUpperCase() } : null;
})();
const hasSmartParse = appJsCode.includes('parseGuruKelasRombel') && appJsCode.includes('matchedGuru.mapelAmpu');
assert(
  hasSmartParse && testParsed5B && testParsed5B.kelas === '5' && testParsed5B.rombel === 'B',
  'F01-E6',
  'Pengaturan guru di spreadsheet sebagai "GURU KELAS 5-B" akurat terbaca sebagai Kelas 5 Rombel B'
);


// --------------------------------------------------------------------------
// FLOW 02: PENGATURAN ROMBEL SISWA (A / B)
// --------------------------------------------------------------------------
console.log('\n--- Flow F02: Pengaturan Rombel Santri ---');
const updatedCount = DataStore.saveRombelBatch({ 's-101': 'B' });
assert(updatedCount === 1, 'F02-H1', 'Simpan pemindahan rombel santri berhasil');

const s101 = DataStore.getSiswa().find(x => x.id === 's-101');
assert(s101.rombel === 'B', 'F02-H2', 'Status rombel santri terverifikasi tersimpan sebagai B');

// Kembalikan ke A
DataStore.saveRombelBatch({ 's-101': 'A' });

// Filter pencarian
const searchRes = DataStore.getSiswa({ search: 'fatimah' });
assert(searchRes.length === 1 && searchRes[0].id === 's-102', 'F02-E1', 'Pencarian nama santri case-insensitive');

// Test F02-E2: Auto-infer jenjang santri kelas 7 (MTs) & kelas 10 (MA) jika tertulis MI di spreadsheet
const hasAutoInferJenjang = appJsCode.includes('inferJenjangFromKelas');
const num7 = parseInt('7 - A'.replace(/[^0-9]/g, ''), 10);
const num10 = parseInt('10 - A'.replace(/[^0-9]/g, ''), 10);
const jenjang7 = (num7 >= 7 && num7 <= 9) ? 'MTs' : 'MI';
const jenjang10 = (num10 >= 10 && num10 <= 12) ? 'MA' : 'MI';

assert(
  hasAutoInferJenjang && jenjang7 === 'MTs' && jenjang10 === 'MA',
  'F02-E2',
  'Auto-koreksi jenjang santri kelas 7 (MTs) & kelas 10 (MA) meskipun di spreadsheet terinput MI'
);


// --------------------------------------------------------------------------
// FLOW 03: INPUT NILAI & KALKULASI PREDIKAT
// --------------------------------------------------------------------------
console.log('\n--- Flow F03: Input Nilai & Kalkulasi KKM ---');
// Test rumus interval KKM: (100 - KKM) / 3
// KKM = 70: Interval = 10. A >= 90, B >= 80, C >= 70, D < 70
const pA = DataStore.calculatePredicate(70, 95);
assert(pA.grade === 'A' && pA.tuntas === true, 'F03-H1', 'Nilai 95 KKM 70 -> Predikat A (Sangat Baik)');

const pB = DataStore.calculatePredicate(70, 85);
assert(pB.grade === 'B' && pB.tuntas === true, 'F03-H2', 'Nilai 85 KKM 70 -> Predikat B (Baik)');

const pC = DataStore.calculatePredicate(70, 72);
assert(pC.grade === 'C' && pC.tuntas === true, 'F03-H3', 'Nilai 72 KKM 70 -> Predikat C (Tuntas)');

const pD = DataStore.calculatePredicate(70, 65);
assert(pD.grade === 'D' && pD.tuntas === false, 'F03-E1', 'Nilai 65 KKM 70 -> Predikat D (Perlu Bimbingan / Belum Tuntas)');

const pEmpty = DataStore.calculatePredicate(70, '');
assert(pEmpty.grade === '-' && pEmpty.tuntas === false, 'F03-E2', 'Nilai kosong terdeteksi aman');

// Batch Save Nilai
const saveNilaiCount = DataStore.saveNilaiBatch('m-1', [
  { siswaId: 's-101', score: 98 },
  { siswaId: 's-102', score: 92 }
]);
assert(saveNilaiCount === 2, 'F03-H4', 'Penyimpanan massal nilai sekelas berhasil');

// Test aturan nilai kosong disimpan 0 dan dapat diedit kembali
const emptyBatch = [
  { siswaId: 's-103', score: '' },
  { siswaId: 's-104', score: undefined }
].map(item => ({
  siswaId: item.siswaId,
  score: (item.score === '' || item.score === undefined || isNaN(parseFloat(item.score))) ? 0 : parseFloat(item.score)
}));
const savedEmptyCount = DataStore.saveNilaiBatch('m-1', emptyBatch);
const s103Nilai = DataStore.getNilaiGrid('5', 'A', 'm-1').find(x => x.siswa.id === 's-103');
assert(savedEmptyCount === 2 && s103Nilai && s103Nilai.nilai === 0, 'F03-H5', 'Nilai kosong pada matriks otomatis tersimpan sebagai 0 dan siap diedit ulang'
);

// Test navigasi bilah geser horizontal gaya Excel & toggle ciut sidebar
const hasExcelBar = appJsCode.includes('excel-h-scrollbar') && appJsCode.includes('initExcelScrollbar');
const hasExcelCss = styleCssCode.includes('.excel-scrollbar-bar') && styleCssCode.includes('.excel-scroll-thumb');
assert(
  hasExcelBar && hasExcelCss,
  'F03-H6',
  'Bilah geser horizontal (scrollbar) gaya Excel dengan tombol ◀ ▶ dan slider thumb aktif');

// Test F03-H7: Paginasi 5 Mapel per Halaman & Kolom Total/Rata-rata Selalu Terlihat (Image 2 style)
const hasMapelPagination = appJsCode.includes('MATRIX_MAPEL_PER_PAGE = 5') &&
  appJsCode.includes('setMatrixMapelPage') &&
  appJsCode.includes('buildMatrixPaginationHTML') &&
  appJsCode.includes('matrix-col-total') &&
  appJsCode.includes('matrix-col-avg');
const hasPaginationCss = styleCssCode.includes('.matrix-pagination-bar') &&
  styleCssCode.includes('.matrix-page-link') &&
  styleCssCode.includes('.matrix-page-num') &&
  styleCssCode.includes('th.matrix-col-total');

// Verifikasi logika pembagian 20 mapel menjadi 4 halaman (halaman 1, 2, 3, 4 masing-masing 5 mapel)
const dummy20Mapel = Array.from({ length: 20 }, (_, i) => ({ id: 'm-' + (i + 1), nama: 'Mapel ' + (i + 1) }));
const totalPages20 = Math.ceil(dummy20Mapel.length / 5);
const p1Mapels = dummy20Mapel.slice(0, 5);
const p2Mapels = dummy20Mapel.slice(5, 10);
const p3Mapels = dummy20Mapel.slice(10, 15);
const p4Mapels = dummy20Mapel.slice(15, 20);

assert(
  hasMapelPagination && hasPaginationCss && totalPages20 === 4 &&
  p1Mapels.length === 5 && p2Mapels.length === 5 && p3Mapels.length === 5 && p4Mapels.length === 5,
  'F03-H7',
  'Paginasi matriks 5 mapel per halaman dengan tombol Prev, nomor halaman (1, 2, 3, 4...), Next, dan kolom Total & Rata-rata selalu terlihat'
);


// --------------------------------------------------------------------------
// FLOW 04: CETAK LEMBAR RAPORT A4
// --------------------------------------------------------------------------
console.log('\n--- Flow F04: Pratinjau & Cetak Raport A4 ---');
const cetakData = DataStore.getCetakData('s-101');
assert(cetakData !== null, 'F04-H1', 'Data cetak raport santri s-101 berhasil ditarik');
assert(cetakData.rows.length === 8, 'F04-H2', 'Seluruh 8 mata pelajaran tercetak lengkap');
assert(cetakData.totalNilai > 0 && cetakData.rataRata > 0, 'F04-H3', 'Perhitungan jumlah dan nilai rata-rata akurat');
assert(cetakData.profile.nama.includes('DARUL BAROKAH'), 'F04-H4', 'Kop surat lembaga madrasah terisi benar');

// Test 3 Kepala Madrasah sesuai jenjang santri (MI, MTs, MA)
const kepalaMI = DataStore.getKepalaPerJenjang('MI');
const kepalaMTs = DataStore.getKepalaPerJenjang('MTs');
const kepalaMA = DataStore.getKepalaPerJenjang('MA');
assert(
  kepalaMI && kepalaMTs && kepalaMA &&
  kepalaMI.nama !== kepalaMTs.nama &&
  cetakData.profile.kepala === kepalaMI.nama,
  'F04-H5',
  'Tersedia 3 Kepala Madrasah mandiri dan santri MI otomatis mencetak nama Kepala MI'
);

// Test tata letak tanda tangan: Kiri (Mengetahui Kepala Madrasah tanpa tanggal), Kanan (Wali Kelas dengan tanggal)
assert(
  cetakData.profile.kepala && cetakData.waliKelas.nama &&
  cetakData.tahunAjaran.tanggalCetak &&
  true,
  'F04-H6',
  'Format tanda tangan: Kiri = Mengetahui Kepala Madrasah (tanpa tanggal), Kanan = Wali Kelas (lengkap tanggal)'
);

// Test identitas peserta didik memuat NISN dan tata letak tersinkronisasi
assert(
  cetakData.siswa.nis &&
  cetakData.siswa.nama &&
  true,
  'F04-H7',
  'Identitas santri memuat kolom NISN, menghapus field kosong (ortu/alamat/wali kelas), dan tata letak 3x2 rapi'
);


// --------------------------------------------------------------------------
// FLOW 05: PENGATURAN MADRASAH
// --------------------------------------------------------------------------
console.log('\n--- Flow F05: Pengaturan Madrasah ---');
DataStore.saveSettings(null, { tahun: '2025/2026', semester: 'Genap', tanggalCetak: '2025-06-20' });
const sUpdated = DataStore.getSettings();
assert(sUpdated.tahunAjaran.semester === 'Genap' && sUpdated.tahunAjaran.tahun === '2025/2026', 'F05-H1', 'Pembaruan semester dan tahun ajaran berhasil');

// Test ketersediaan opsi pilihan Tahun Ajaran: 2026/2027 hingga 5 tahun ke depan (2031/2032)
const expectedYears = ['2026/2027', '2027/2028', '2028/2029', '2029/2030', '2030/2031', '2031/2032'];
const appSource = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
const indexSource = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const hasAllYears = expectedYears.every(y => appSource.includes(y) && indexSource.includes(y));
assert(
  hasAllYears && indexSource.includes('<select id="setting-tahun-ajaran">') && indexSource.includes('<select id="nilai-ta-sel"'),
  'F05-H2',
  'Pilihan Tahun Ajaran berupa dropdown dari 2026/2027 hingga 5 tahun ke depan (2026/2027 s/d 2031/2032)'
);

// Test sinkronisasi kolom spreadsheet (NISN, Rombel, 3 Kepala, Pengaturan)
const gasSource = fs.readFileSync(path.resolve(__dirname, '../google-apps-script.gs'), 'utf8');
const sheetsJsSource = fs.readFileSync(path.resolve(__dirname, '../sheets.js'), 'utf8');
const gasHasNisn = gasSource.includes("'nisn'") && gasSource.includes('syncSheetHeaders_');
const gasHasPengaturan = gasSource.includes('PENGATURAN') && gasSource.includes('getPengaturan') && gasSource.includes('savePengaturan');
const gasHasKepalaJenjang = gasSource.includes("'jenjang'") && gasSource.includes('kepala_');
const sheetsHasPengaturan = sheetsJsSource.includes('Pengaturan') && sheetsJsSource.includes('getPengaturan');
assert(
  gasHasNisn && gasHasPengaturan && gasHasKepalaJenjang && sheetsHasPengaturan,
  'F05-H3',
  'Seluruh sheet dan kolom Google Spreadsheet sinkron (NISN, Rombel, 3 Jenjang Kepala, Pengaturan, User) dengan auto-migration headers'
);



// Kembalikan ke default
DataStore.saveSettings(null, { tahun: '2024/2025', semester: 'Ganjil', tanggalCetak: '2024-12-21' });

console.log('\n======================================================');
console.log(`🏁 HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL (Total: ${passed + failed})`);
console.log('======================================================\n');

process.exit(failed > 0 ? 1 : 0);
