# Build Log: Raport Madrasah Diniah Clone

Log proses perakitan layar per layar (*clean-room implementation*) berdasarkan `recon.md`, `architecture.md`, dan `components.md`.

| Screen ID | Tanggal | Status | Keterangan & Catatan Teknis |
| :--- | :--- | :--- | :--- |
| **S01** (Login) | 2026-11-09 | **Done** | Autentikasi Admin dan Wali Kelas (misal: `pakguru` / `123456`). Input ter-trimming otomatis, bebas masalah auto-capitalization keyboard HP. |
| **S02** (Dashboard) | 2026-11-09 | **Done** | Metrik statistik dinamis terfilter otomatis sesuai role penugasan (jika Wali Kelas 5A, hanya menampilkan data kelas 5A). |
| **S03** (Data Siswa & Rombel) | 2026-11-09 | **Done** | Tabel santri dengan radio button seleksi Rombel A / B interaktif, dirty-state ring visual, dan tombol Simpan Sekaligus. |
| **S04** (Input Nilai) | 2026-11-09 | **Done** | *Vertical Slice Core Loop*. Navigasi tab mata pelajaran cepat, kalkulasi otomatis predikat A/B/C/D & status tuntas secara real-time saat angka diketik, penyimpanan serentak per kelas. |
| **S05** (Mata Pelajaran) | 2026-11-09 | **Done** | Daftar kurikulum mapel lengkap dengan standar KKM masing-masing untuk acuan perhitungan predikat. |
| **S06** (Kepala Madrasah) | 2026-11-09 | **Done** | Integrasi identitas pimpinan lembaga dan slot tanda tangan digital pada lembar raport. |
| **S07** (Cetak Raport A4) | 2026-11-09 | **Done** | *Vertical Slice Core Loop*. Lembar cetak resmi standar ISO A4 portrait dengan Kop Surat ganda Arab-Indonesia, tabel capaian kompetensi, dan blok pengesahan. `@media print` otomatis menyembunyikan sidebar, topbar, dan tombol aksi. |
| **S08** (Pengaturan) | 2026-11-09 | **Done** | Form pengaturan nama lembaga, alamat, tahun ajaran aktif, semester, dan tanggal titimangsa cetak. |

### Catatan Pembangunan:
1. **Vertical Slice:** Alur inti Login ➔ Input Nilai ➔ Cetak Raport A4 telah terhubung end-to-end dengan sempurna dan dapat diuji langsung.
2. **Kepatuhan Token:** 100% menggunakan token dari `tokens.css` dan kelas Tailwind hasil ekstraksi `replica-design`.
3. **Data Layer:** Berjalan dengan state mandiri (`clone/data.js`) dengan signature API yang siap dihubungkan ke database PostgreSQL/SQLite di tahap `replica-backend`.
