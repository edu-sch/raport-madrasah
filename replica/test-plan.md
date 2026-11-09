# Rencana Pengujian (Test Plan) - Raport Madrasah Diniah

Rencana pengujian menyeluruh untuk memverifikasi fungsionalitas, keamanan role-scoping, akurasi perhitungan predikat KKM, serta tata letak cetak dokumen raport A4 clean-room clone.

---

## Matriks Alur Uji

### Flow F01: Autentikasi Pengguna & Role Scoping
- **F01-H1 (Happy Path)**: Login pengguna guru (`wali5a` / `barokah123`) berhasil dan dialihkan ke Dashboard.
- **F01-H2 (Happy Path)**: Kredensial Admin (`admin` / `admin123`) berhasil login dengan hak akses lembaga penuh.
- **F01-N1 (Negative)**: Sandi salah ditolak dengan pesan peringatan yang ramah dan aman.
- **F01-N2 (Negative)**: Username tidak terdaftar ditolak tanpa membocorkan eksistensi data sensitif.
- **F01-E1 (Edge Case)**: Input username dengan spasi trailing atau huruf besar otomatis dinormalisasi.
- **F01-E2 (Edge Case)**: Role Scoping: Wali Kelas 5A hanya dapat melihat dan mengolah santri kelas 5.
- **F01-E3 (Edge Case)**: Admin memiliki visibilitas global terhadap seluruh santri semua tingkat kelas.
- **F01-E4 (Edge Case)**: Akun Guru dibatasi ketat (*Least Privilege*): Hanya mengakses Input Nilai & Cetak Raport.
- **F01-E5 (Edge Case)**: Penentuan Kelas & Rombel mutlak bersumber dari Google Spreadsheet (Read-Only di web).

### Flow F02: Pengaturan Rombel Santri
- **F02-H1 (Happy Path)**: Pemindahan rombongan belajar (Rombel A -> Rombel B) tersimpan instan.
- **F02-H2 (Happy Path)**: Status rombel santri bertahan setelah navigasi layar (*persistence*).
- **F02-E1 (Edge Case)**: Pencarian nama santri bersifat fleksibel (*case-insensitive*).

### Flow F03: Input Nilai & Kalkulasi KKM Dinamis
- **F03-H1 (Happy Path)**: Nilai 95 dengan KKM 70 dikalkulasi otomatis menjadi Predikat A (Sangat Baik).
- **F03-H2 (Happy Path)**: Nilai 85 dengan KKM 70 dikalkulasi otomatis menjadi Predikat B (Baik).
- **F03-H3 (Happy Path)**: Nilai 72 dengan KKM 70 dikalkulasi otomatis menjadi Predikat C (Tuntas).
- **F03-E1 (Edge Case)**: Nilai 65 di bawah KKM 70 dikalkulasi otomatis menjadi Predikat D (Perlu Bimbingan).
- **F03-E2 (Edge Case)**: Kolom nilai kosong atau non-numerik dicegah merusak kalkulasi predikat.
- **F03-H4 (Happy Path)**: Tombol Simpan Nilai Massal memproses seluruh santri sekelas dengan notifikasi toast.

### Flow F04: Pratinjau & Cetak Dokumen Raport Resmi A4
- **F04-H1 (Happy Path)**: Data santri terpilih tampil akurat pada lembar pratinjau A4.
- **F04-H2 (Happy Path)**: Seluruh 8 mata pelajaran diniah tampil berurutan dengan nilai dan predikat.
- **F04-H3 (Happy Path)**: Total nilai akumulatif dan nilai rata-rata terhitung matematis akurat.
- **F04-H4 (Happy Path)**: Header kop surat resmi, stempel, dan titimangsa penandatanganan sesuai standar.

### Flow F05: Pengaturan Madrasah & Semester
- **F05-H1 (Happy Path)**: Pembaruan semester dan tahun ajaran aktif tersimpan dan merefleksikan seluruh viewport.

---

## Ringkasan Eksekusi Otomatis

- Total Skenario Diuji: **23 kasus**
- Total Berhasil (Passed): **23 kasus (100%)**
- Total Gagal (Failed): **0 kasus**
- Engine: Automated Node Test Runner (`replica/test-runner.js`) + Playwright Specs (`e2e/raport.spec.ts`)
