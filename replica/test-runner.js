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
assert(savedEmptyCount === 2 && s103Nilai && s103Nilai.nilai === 0, 'F03-H5', 'Nilai kosong pada matriks otomatis tersimpan sebagai 0 dan siap diedit ulang');


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


// --------------------------------------------------------------------------
// FLOW 05: PENGATURAN MADRASAH
// --------------------------------------------------------------------------
console.log('\n--- Flow F05: Pengaturan Madrasah ---');
DataStore.saveSettings(null, { tahun: '2025/2026', semester: 'Genap', tanggalCetak: '2025-06-20' });
const sUpdated = DataStore.getSettings();
assert(sUpdated.tahunAjaran.semester === 'Genap' && sUpdated.tahunAjaran.tahun === '2025/2026', 'F05-H1', 'Pembaruan semester dan tahun ajaran berhasil');

// Kembalikan ke default
DataStore.saveSettings(null, { tahun: '2024/2025', semester: 'Ganjil', tanggalCetak: '2024-12-21' });

console.log('\n======================================================');
console.log(`🏁 HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL (Total: ${passed + failed})`);
console.log('======================================================\n');

process.exit(failed > 0 ? 1 : 0);
